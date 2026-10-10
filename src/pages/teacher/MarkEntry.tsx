import { useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useBase } from '@/app/useBase';
import { useI18n } from '@/i18n';
import { PageHeader } from '@/components/PageHeader';
import { MasteryPill, Section, TopicBar } from '@/components/dashboard';
import { Button, Card, Chip, IconButton, bandOf } from '@/components/ui';
import { IconChevronRight, IconPencil } from '@/components/icons';
import { ExamForm } from '@/features/teacher/ExamForm';
import { ScoreInput } from '@/features/teacher/ScoreInput';
import { applyPaste, examStudents, examSummary, missingMarks, nextCell, parsePaste, studentPct, totalMax } from '@/lib/marks';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { useData } from '@/store/data';
import { nameOf } from '@/lib/names';
import { useAppData, useToday } from '@/store/hooks';
import type { Student } from '@/types';

/** Enter marks for one exam: a spreadsheet grid on PC, a student-by-student stepper on phone. */
export function TeacherMarkEntry() {
  const { examId = '' } = useParams();
  const { t, n, d, lang } = useI18n();
  const base = useBase();
  const navigate = useNavigate();
  const data = useAppData();
  const today = useToday();
  const wide = useMediaQuery('(min-width: 768px)');
  const [editing, setEditing] = useState(false);
  const exam = data.assessments.find((a) => a.id === examId);

  if (!exam) {
    return (
      <Card className="space-y-3 text-center">
        <p className="font-display text-lg font-semibold">{t('marks.notFound')}</p>
        <div><Link to={`${base}/marks`} className="font-semibold text-brand-text hover:underline">{t('marks.back')}</Link></div>
      </Card>
    );
  }

  const students = examStudents(data, exam);
  const summary = examSummary(data, exam, today);
  const missing = missingMarks(data, exam);
  const batch = data.batches.find((b) => b.id === exam.batchId);
  const topicName = (id: string) => data.topics.find((x) => x.id === id)?.name[lang] ?? id;
  const nm = (s: Student) => (lang === 'bn' && s.nameBn ? s.nameBn : s.name);
  const title = lang === 'bn' && exam.nameBn ? exam.nameBn : exam.name;

  return (
    <div className="space-y-6">
      <Link to={`${base}/marks`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-text hover:underline">
        <IconChevronRight width={16} height={16} className="rotate-180" /> {t('marks.back')}
      </Link>
      <PageHeader
        eyebrow={batch ? nameOf(batch, lang) : ''}
        title={title}
        desc={`${d(exam.date)} · ${t('marks.outOf', { n: n(totalMax(exam)) })}`}
        aside={<Button variant="secondary" onClick={() => setEditing(true)}><IconPencil width={16} height={16} /> {t('common.edit')}</Button>}
      />

      <div className="flex flex-wrap items-center gap-2">
        {summary.upcoming && <Chip tone="gold">{t('marks.upcoming')}</Chip>}
        {summary.avgPct !== null && <MasteryPill pct={Math.round(summary.avgPct)} />}
        <Chip tone="muted">{missing > 0 ? t('marks.missing', { n: n(missing) }) : t('marks.complete')}</Chip>
        <span className="text-xs text-muted" aria-live="polite">{t('marks.autosave')}</span>
      </div>

      {students.length === 0 ? (
        <Card className="text-center text-sm text-muted">{t('marks.noStudents')}</Card>
      ) : wide ? (
        <Grid examId={exam.id} students={students} nm={nm} topicName={topicName} />
      ) : (
        <Stepper examId={exam.id} students={students} nm={nm} topicName={topicName} />
      )}

      {summary.scored > 0 && (
        <Section title={t('marks.topicAverages')}>
          <ul className="space-y-3.5">
            {summary.topicAverages.map((x, i) => x.avgPct !== null && (
              <TopicBar key={x.topicId} i={i} name={topicName(x.topicId)} value={x.avgPct} valueLabel={`${n(Math.round(x.avgPct))}%`} tone={bandOf(x.avgPct)} />
            ))}
          </ul>
        </Section>
      )}

      <ExamForm open={editing} exam={exam} today={today} onClose={() => setEditing(false)} onDeleted={() => navigate(`${base}/marks`)} />
    </div>
  );
}

type EntryProps = { examId: string; students: Student[]; nm: (s: Student) => string; topicName: (id: string) => string };

function Grid({ examId, students, nm, topicName }: EntryProps) {
  const { t, n } = useI18n();
  const exam = useData((s) => s.assessments.find((a) => a.id === examId))!;
  const cells = useRef(new Map<string, HTMLInputElement>());
  const [note, setNote] = useState('');
  const studentIds = useMemo(() => students.map((s) => s.id), [students]);
  const topicIds = exam.parts.map((p) => p.topicId);

  const focus = (row: number, col: number) => cells.current.get(`${row}:${col}`)?.focus();
  const onKey = (row: number, col: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    const go = nextCell(students.length, topicIds.length, row, col, e.key, e.shiftKey);
    if (go) {
      e.preventDefault();
      focus(go.row, go.col);
    } else if (e.key === 'Enter') {
      e.preventDefault(); // Enter on the last row stays put
    }
  };
  const onPaste = (row: number, col: number) => (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (!/[\t\n]/.test(text)) return; // a single value pastes normally
    e.preventDefault();
    const { applied, skipped } = (() => {
      let result = { applied: 0, skipped: 0 };
      useData.getState().apply((d) => {
        const r = applyPaste(d, examId, studentIds, topicIds, { row, col }, parsePaste(text));
        result = { applied: r.applied, skipped: r.skipped };
        return r.data;
      });
      return result;
    })();
    setNote(t('marks.pasted', { a: n(applied), s: n(skipped) }));
  };

  return (
    <Card className="overflow-hidden p-0 sm:p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <caption className="sr-only">{t('marks.gridCaption')}</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th scope="col" className="sticky left-0 bg-surface px-4 py-3 font-medium">{t('common.student')}</th>
              {exam.parts.map((p) => (
                <th key={p.topicId} scope="col" className="px-2 py-3 text-center font-medium">
                  <span className="line-clamp-2 max-w-28 leading-snug" title={topicName(p.topicId)}>{topicName(p.topicId)}</span>
                  <span className="num font-normal">/ {n(p.maxMarks)}</span>
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-center font-medium">{t('marks.total')}</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, row) => {
              const pct = studentPct(exam, s.id);
              return (
                <tr key={s.id} className="border-b border-line/60 last:border-0 hover:bg-surface-2/60">
                  <th scope="row" className="sticky left-0 bg-surface px-4 py-2 text-left font-medium whitespace-nowrap">{nm(s)}</th>
                  {exam.parts.map((p, col) => (
                    <td key={p.topicId} className="px-2 py-1.5 text-center">
                      <ScoreInput
                        ref={(el) => { if (el) cells.current.set(`${row}:${col}`, el); else cells.current.delete(`${row}:${col}`); }}
                        label={`${nm(s)}, ${topicName(p.topicId)}`}
                        value={exam.scores[s.id]?.[p.topicId] ?? null}
                        max={p.maxMarks}
                        onCommit={(v) => useData.getState().setScore(examId, s.id, p.topicId, v)}
                        onKeyDown={onKey(row, col)}
                        onPaste={onPaste(row, col)}
                      />
                    </td>
                  ))}
                  <td className="px-4 py-2 text-center">{pct === null ? <span className="text-muted">–</span> : <MasteryPill pct={Math.round(pct)} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line px-4 py-3 text-xs text-muted" role="status" aria-live="polite">{note || t('marks.gridHelp')}</p>
    </Card>
  );
}

function Stepper({ examId, students, nm, topicName }: EntryProps) {
  const { t, n } = useI18n();
  const exam = useData((s) => s.assessments.find((a) => a.id === examId))!;
  const [i, setI] = useState(0);
  const idx = Math.min(i, students.length - 1);
  const s = students[idx];
  const pct = studentPct(exam, s.id);

  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <IconButton label={t('marks.prev')} onClick={() => setI(Math.max(0, idx - 1))} disabled={idx === 0} className="border border-line-strong disabled:opacity-40">
          <IconChevronRight width={20} height={20} className="rotate-180" />
        </IconButton>
        <div className="min-w-0 text-center">
          <p className="font-display truncate text-lg font-semibold">{nm(s)}</p>
          <p className="num text-xs text-muted" aria-live="polite">{t('marks.studentOf', { i: n(idx + 1), total: n(students.length) })}</p>
        </div>
        <IconButton label={t('marks.next')} onClick={() => setI(Math.min(students.length - 1, idx + 1))} disabled={idx === students.length - 1} className="border border-line-strong disabled:opacity-40">
          <IconChevronRight width={20} height={20} />
        </IconButton>
      </div>

      <ul className="space-y-3">
        {exam.parts.map((p, k) => (
          <li key={p.topicId} className="flex items-center justify-between gap-3">
            <span className="min-w-0 text-sm font-medium">{topicName(p.topicId)}</span>
            <span className="flex items-center gap-2">
              <ScoreInput
                key={`${s.id}-${p.topicId}`}
                size="lg"
                label={`${nm(s)}, ${topicName(p.topicId)}`}
                value={exam.scores[s.id]?.[p.topicId] ?? null}
                max={p.maxMarks}
                onCommit={(v) => useData.getState().setScore(examId, s.id, p.topicId, v)}
                onKeyDown={(e) => { if (e.key === 'Enter' && k === exam.parts.length - 1 && idx < students.length - 1) { e.preventDefault(); setI(idx + 1); } }}
              />
              <span className="num text-sm text-muted">/ {n(p.maxMarks)}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        {pct === null ? <span className="text-sm text-muted">{t('marks.noMarks')}</span> : <MasteryPill pct={Math.round(pct)} />}
        <Button onClick={() => setI(Math.min(students.length - 1, idx + 1))} disabled={idx === students.length - 1}>{t('marks.nextStudent')}</Button>
      </div>
    </Card>
  );
}
