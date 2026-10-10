import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useBase } from '@/app/useBase';
import { useI18n } from '@/i18n';
import { PageHeader } from '@/components/PageHeader';
import { Section, StatCard, TopicBar, MasteryPill, PersonRow } from '@/components/dashboard';
import { Reveal } from '@/components/motion';
import { Button, Card, Chip, IconButton, Segmented } from '@/components/ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { IconBell, IconCalendarCheck, IconChart, IconChevronRight, IconPencil, IconUsers, IconWallet } from '@/components/icons';
import { BatchTeacher } from '@/features/center/BatchTeacher';
import { BatchForm } from '@/features/teacher/BatchForm';
import { ExamForm } from '@/features/teacher/ExamForm';
import { BatchAiCard } from '@/features/ai/AiCards';
import { InsightLines } from '@/features/teacher/InsightLines';
import { LogClassSheet } from '@/features/teacher/LogClassSheet';
import { MessageSheet } from '@/features/teacher/MessageSheet';
import { StudentForm } from '@/features/teacher/StudentForm';
import { attendanceRate, rangeStart } from '@/lib/attendance';
import { batchTopicStats, scopeSummary } from '@/lib/batch';
import { overallMastery, studentTopicMastery } from '@/lib/mastery';
import { examSummary } from '@/lib/marks';
import { useData } from '@/store/data';
import { useAppData, useToday } from '@/store/hooks';
import type { ClassSession, Student } from '@/types';
import { WEEKDAYS } from '@/data/presets';

type Tab = 'overview' | 'students' | 'exams' | 'classes';

export function TeacherBatchDetail() {
  const { id = '' } = useParams();
  const { t, n, d, time, lang } = useI18n();
  const base = useBase();
  const navigate = useNavigate();
  const data = useAppData();
  const today = useToday();
  const batch = data.batches.find((b) => b.id === id);
  const [tab, setTab] = useState<Tab>('overview');
  const [editing, setEditing] = useState(false);
  const [student, setStudent] = useState<Student | 'new' | null>(null);
  const [exam, setExam] = useState<'new' | null>(null);
  const [session, setSession] = useState<ClassSession | 'new' | null>(null);
  const [deleteSession, setDeleteSession] = useState<ClassSession | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const ctx = useMemo(() => ({ today }), [today]);
  const summary = useMemo(() => (batch ? scopeSummary(data, [batch.id], ctx) : null), [data, batch, ctx]);
  const topicStats = useMemo(() => (batch ? batchTopicStats(data, [batch.id], ctx).filter((x) => x.withData > 0) : []), [data, batch, ctx]);
  const members = useMemo(() => data.students.filter((s) => batch && s.batchIds.includes(batch.id)), [data.students, batch]);
  const rows = useMemo(
    () =>
      members.map((s) => ({
        s,
        mastery: overallMastery(studentTopicMastery(data, s.id, { batchIds: [id], today })),
        att: attendanceRate(data, { batchIds: [id], studentId: s.id, from: rangeStart('8w', today), to: today }).pct,
      })),
    [data, members, id, today],
  );

  if (!batch || !summary) {
    return (
      <Card className="space-y-3 text-center">
        <p className="font-display text-lg font-semibold">{t('batches.notFound')}</p>
        <div><Link to={`${base}/batches`} className="font-semibold text-brand-text hover:underline">{t('batches.back')}</Link></div>
      </Card>
    );
  }

  const name = lang === 'bn' && batch.nameBn ? batch.nameBn : batch.name;
  const nm = (s: Student) => (lang === 'bn' && s.nameBn ? s.nameBn : s.name);
  const topicName = (tid: string) => data.topics.find((x) => x.id === tid)?.name[lang] ?? tid;
  const term = data.terms.find((x) => x.id === batch.termId);
  const days = batch.classDays.map((dd) => WEEKDAYS.find((w) => w.id === dd)![lang]).join(' · ');
  const exams = data.assessments.filter((a) => a.batchId === id).sort((a, b) => b.date.localeCompare(a.date));
  const sessions = data.sessions.filter((s) => s.batchId === id).sort((a, b) => b.date.localeCompare(a.date));
  const thisMonthFees = summary.feesDueThisMonth ? Math.round((summary.feesCollectedThisMonth / summary.feesDueThisMonth) * 100) : 0;

  return (
    <div className="space-y-6">
      <Link to={`${base}/batches`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-text hover:underline">
        <IconChevronRight width={16} height={16} className="rotate-180" /> {t('batches.back')}
      </Link>

      <PageHeader
        eyebrow={`${batch.level}${term ? ` · ${lang === 'bn' && term.nameBn ? term.nameBn : term.name}` : ''}`}
        title={name}
        desc={`${days}${batch.startTime ? ` · ${time(batch.startTime)}` : ''} · ৳${n(batch.monthlyFee)}${t('batches.perMonth')}`}
        aside={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}><IconPencil width={16} height={16} /> {t('common.edit')}</Button>
            <Button onClick={() => setSession('new')}>{t('logClass.cta')}</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        <StatCard i={1} icon={IconUsers} label={t('common.students')} value={summary.students} />
        <StatCard i={2} icon={IconCalendarCheck} label={t('common.attendance')} value={summary.attendancePct ?? 0} suffix="%" hint={t('teacher.today.last4w')} />
        <StatCard i={3} icon={IconChart} label={t('common.mastery')} value={Math.round(summary.avgMastery ?? 0)} suffix="%" />
        <StatCard i={4} icon={IconWallet} label={t('batches.feesCollected')} value={thisMonthFees} suffix="%" hint={`৳${n(summary.feesCollectedThisMonth)} / ৳${n(summary.feesDueThisMonth)}`} onClick={() => navigate(`${base}/fees`)} />
      </div>

      <Segmented<Tab>
        label={t('batches.sections')}
        value={tab}
        onChange={setTab}
        className="w-full sm:w-auto"
        options={[
          { value: 'overview', label: t('batches.tab.overview') },
          { value: 'students', label: t('batches.tab.students') },
          { value: 'exams', label: t('batches.tab.exams') },
          { value: 'classes', label: t('batches.tab.classes') },
        ]}
      />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <Section title={t('batches.insight')}>
            <InsightLines batchIds={[id]} today={today} limit={5} />
          </Section>
          <Section title={t('batches.topics')}>
            {topicStats.length === 0 ? <p className="text-sm text-muted">{t('teacher.today.noMarks')}</p> : (
              <ul className="space-y-3.5">
                {topicStats.slice(0, 6).map((tp, i) => (
                  <TopicBar key={tp.topicId} i={i} name={topicName(tp.topicId)} value={tp.redPct} valueLabel={`${n(tp.redPct)}%`} tone={tp.redPct >= 40 ? 'red' : tp.redPct >= 20 ? 'yellow' : 'green'} />
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-muted">{t('teacher.today.weakNote')}</p>
          </Section>
          <div className="lg:col-span-2"><BatchTeacher batch={batch} mastery={summary.avgMastery} attendance={summary.attendancePct} today={today} /></div>
          <div className="lg:col-span-2"><BatchAiCard batchIds={[id]} today={today} /></div>
        </div>
      )}

      {tab === 'students' && (
        <Reveal>
          <Card className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold sm:text-lg">{t('batches.tab.students')} ({n(members.length)})</h2>
              <Button variant="secondary" onClick={() => setStudent('new')}>+ {t('students.add')}</Button>
            </div>
            {rows.length === 0 && <p className="py-4 text-sm text-muted">{t('batches.noStudents')}</p>}
            <ul className="divide-y divide-line">
              {rows.map(({ s, mastery, att }) => (
                <PersonRow
                  key={s.id}
                  name={nm(s)}
                  to={`${base}/students/${s.id}`}
                  meta={`${s.className}${att !== null ? ` · ${t('common.attendance')} ${n(att)}%` : ''}`}
                  right={
                    <span className="flex items-center gap-1">
                      {mastery !== null && <MasteryPill pct={Math.round(mastery)} />}
                      <IconButton label={t('message.to', { student: nm(s) })} onClick={() => setMessage(s.id)}><IconBell width={20} height={20} /></IconButton>
                      <IconButton label={t('common.editName', { name: nm(s) })} onClick={() => setStudent(s)}><IconPencil width={20} height={20} /></IconButton>
                    </span>
                  }
                />
              ))}
            </ul>
          </Card>
        </Reveal>
      )}

      {tab === 'exams' && (
        <Reveal>
          <Card className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold sm:text-lg">{t('batches.tab.exams')} ({n(exams.length)})</h2>
              <Button variant="secondary" onClick={() => setExam('new')}>+ {t('marks.addExam')}</Button>
            </div>
            {exams.length === 0 && <p className="py-4 text-sm text-muted">{t('marks.noExams')}</p>}
            <ul className="divide-y divide-line">
              {exams.map((a) => {
                const sm = examSummary(data, a, today);
                return (
                  <li key={a.id}>
                    <Link to={`${base}/marks/${a.id}`} className="press flex min-h-14 items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{lang === 'bn' && a.nameBn ? a.nameBn : a.name}</span>
                        <span className="block text-xs text-muted">{d(a.date)} · {a.parts.map((p) => topicName(p.topicId)).join(', ')}</span>
                      </span>
                      {sm.upcoming ? <Chip tone="gold">{t('marks.upcoming')}</Chip> : sm.avgPct === null ? <Chip tone="muted">{t('marks.noMarks')}</Chip> : <MasteryPill pct={Math.round(sm.avgPct)} />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </Reveal>
      )}

      {tab === 'classes' && (
        <Reveal>
          <Card className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold sm:text-lg">{t('batches.tab.classes')} ({n(sessions.length)})</h2>
              <Button variant="secondary" onClick={() => setSession('new')}>+ {t('logClass.cta')}</Button>
            </div>
            {sessions.length === 0 && <p className="py-4 text-sm text-muted">{t('batches.noClasses')}</p>}
            <ul className="divide-y divide-line">
              {sessions.slice(0, 20).map((s) => {
                const present = Object.values(s.attendance).filter((v) => v !== 'absent').length;
                return (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{d(s.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {s.topicIds.map(topicName).join(', ')}</span>
                      <span className="block text-xs text-muted">{t('batches.classMeta', { u: n(s.understanding), p: n(present), t: n(Object.keys(s.attendance).length) })}{s.homework ? ` · ${s.homework}` : ''}</span>
                    </span>
                    <IconButton label={t('common.editName', { name: d(s.date) })} onClick={() => setSession(s)}><IconPencil width={20} height={20} /></IconButton>
                    <button type="button" onClick={() => setDeleteSession(s)} className="press min-h-11 cursor-pointer rounded-xl px-2 text-xs font-medium text-red-fg hover:bg-red-bg">{t('common.delete')}</button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </Reveal>
      )}

      <BatchForm open={editing} batch={batch} onClose={() => setEditing(false)} onDeleted={() => navigate(`${base}/batches`)} />
      {student && <StudentForm open student={student === 'new' ? null : student} defaultBatchId={id} onClose={() => setStudent(null)} />}
      {exam && <ExamForm open exam={null} defaultBatchId={id} today={today} onClose={() => setExam(null)} onSaved={(aid) => navigate(`${base}/marks/${aid}`)} />}
      <LogClassSheet open={session !== null} batchId={id} session={session === 'new' ? null : session} today={today} onClose={() => setSession(null)} />
      <MessageSheet studentId={message} batchIds={[id]} onClose={() => setMessage(null)} />
      <ConfirmDialog open={deleteSession !== null} title={t('batches.deleteClass')} confirmLabel={t('common.delete')} onClose={() => setDeleteSession(null)} onConfirm={() => deleteSession && useData.getState().remove('sessions', deleteSession.id)}>
        {deleteSession && d(deleteSession.date)}
      </ConfirmDialog>
    </div>
  );
}
