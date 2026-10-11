import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBase } from '@/app/useBase';
import { useI18n } from '@/i18n';
import { PageHeader } from '@/components/PageHeader';
import { MasteryPill } from '@/components/dashboard';
import { Reveal } from '@/components/motion';
import { Button, Card, Chip, cx } from '@/components/ui';
import { IconChevronRight, IconClock } from '@/components/icons';
import { ExamForm } from '@/features/teacher/ExamForm';
import { GradingSheet } from '@/features/teacher/GradingSheet';
import { useGrading } from '@/lib/useGrading';
import { LockedCard } from '@/features/premium/LockedCard';
import { examSummary, missingMarks } from '@/lib/marks';
import { nameOf } from '@/lib/names';
import { useAppData, useScope } from '@/store/hooks';
import type { Assessment } from '@/types';

export function TeacherMarks() {
  const { t, n, d, lang } = useI18n();
  const base = useBase();
  const navigate = useNavigate();
  const data = useAppData();
  const { batchIds, filter, today } = useScope();
  const [adding, setAdding] = useState(false);
  const [grading, setGrading] = useState(false);
  const { show } = useGrading();

  const exams = useMemo(() => data.assessments.filter((a) => batchIds.includes(a.batchId)), [data.assessments, batchIds]);
  const upcoming = exams.filter((a) => a.date > today).sort((a, b) => a.date.localeCompare(b.date));
  const past = exams.filter((a) => a.date <= today).sort((a, b) => b.date.localeCompare(a.date));
  const nm = (s: { id: string }) => {
    const x = data.students.find((st) => st.id === s.id);
    return x ? (lang === 'bn' && x.nameBn ? x.nameBn : x.name) : '';
  };
  const topicName = (id: string) => data.topics.find((x) => x.id === id)?.name[lang] ?? id;
  const batchName = (id: string) => { const b = data.batches.find((x) => x.id === id); return b ? nameOf(b, lang) : ''; };

  const card = (a: Assessment, i: number) => {
    const s = examSummary(data, a, today);
    const missing = missingMarks(data, a);
    return (
      <Reveal key={a.id} i={i}>
        <Card className="h-full space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-base leading-snug font-semibold tracking-[-0.015em]">
                <Link to={`${base}/marks/${a.id}`} className="after:absolute after:inset-0 after:rounded-[1.75rem] focus-visible:outline-offset-4">
                  {lang === 'bn' && a.nameBn ? a.nameBn : a.name}
                </Link>
              </h3>
              <p className="mt-0.5 text-xs text-muted">{filter === 'all' ? `${batchName(a.batchId)} · ` : ''}{d(a.date)}</p>
            </div>
            {s.upcoming ? <Chip tone="gold"><IconClock width={13} height={13} />{t('marks.upcoming')}</Chip> : s.avgPct === null ? <Chip tone="muted">{t('marks.noMarks')}</Chip> : <MasteryPill pct={Math.round(s.avgPct)} />}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {a.parts.map((p) => <Chip key={p.topicId} tone="muted">{topicName(p.topicId)}</Chip>)}
          </div>
          {s.scored > 0 ? (
            <dl className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-xl border border-line bg-surface-2 p-2"><dt className="text-muted">{t('marks.average')}</dt><dd className="num font-semibold">{show(s.avgPct as number)}</dd></div>
              <div className="rounded-xl border border-line bg-surface-2 p-2"><dt className="text-muted">{t('marks.highest')}</dt><dd className="truncate font-semibold">{s.highest && `${nm({ id: s.highest.studentId }).split(' ')[0]} ${show(s.highest.pct)}`}</dd></div>
              <div className="rounded-xl border border-line bg-surface-2 p-2"><dt className="text-muted">{t('marks.lowest')}</dt><dd className="truncate font-semibold">{s.lowest && `${nm({ id: s.lowest.studentId }).split(' ')[0]} ${show(s.lowest.pct)}`}</dd></div>
            </dl>
          ) : null}
          <div className="flex items-center justify-between gap-2 text-xs text-muted">
            <span>{missing > 0 ? t('marks.missing', { n: n(missing) }) : t('marks.complete')}</span>
            <IconChevronRight width={16} height={16} />
          </div>
        </Card>
      </Reveal>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('teacher.marks.eyebrow')} title={t('page.teacher.marks.title')} desc={t('page.teacher.marks.desc')} aside={<div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setGrading(true)}>{t('marks.grading')}</Button><Button onClick={() => setAdding(true)} disabled={data.batches.length === 0}>+ {t('marks.addExam')}</Button></div>} />

      {exams.length === 0 && (
        <Card className="space-y-3 text-center">
          <p className="font-display text-lg font-semibold">{t('marks.noExams')}</p>
          <p className="mx-auto max-w-md text-sm text-muted">{t('marks.emptyBody')}</p>
          {data.batches.length > 0 && <div><Button onClick={() => setAdding(true)}>{t('marks.addExam')}</Button></div>}
        </Card>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-3" aria-label={t('marks.upcomingSection')}>
          <h2 className={cx('text-xs font-semibold tracking-[0.14em] text-gold uppercase')}>{t('marks.upcomingSection')}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 lg:gap-6">{upcoming.map(card)}</div>
        </section>
      )}
      {past.length > 0 && (
        <section className="space-y-3" aria-label={t('marks.recentSection')}>
          <h2 className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">{t('marks.recentSection')}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 lg:gap-6">{past.map((a, i) => card(a, i + upcoming.length))}</div>
        </section>
      )}

      <LockedCard id="paper" />

      <GradingSheet open={grading} onClose={() => setGrading(false)} />
      <ExamForm open={adding} exam={null} defaultBatchId={batchIds[0]} today={today} onClose={() => setAdding(false)} onSaved={(id) => navigate(`${base}/marks/${id}`)} />
    </div>
  );
}
