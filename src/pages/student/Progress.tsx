import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { PageHeader } from '@/components/PageHeader';
import { LineChart, ProgressBar, Ring } from '@/components/charts';
import { MasteryPill, Section, StatCard } from '@/components/dashboard';
import { Card, Chip } from '@/components/ui';
import { IconCalendarCheck, IconChart, IconTarget } from '@/components/icons';
import { SubjectSwitcher, pickSubject } from '@/features/student/SubjectSwitcher';
import { ReportSheet } from '@/features/shared/ReportSheet';
import { Button } from '@/components/ui';
import { attendanceRate, rangeStart } from '@/lib/attendance';
import { goalFor } from '@/lib/goals';
import { goalProgress, assessmentTotals, overallMastery, overallTrend, studentTopicMastery } from '@/lib/mastery';
import { examStudents, studentPct } from '@/lib/marks';
import { studentSubjectIds } from '@/lib/scope';
import { useActiveStudent } from '@/store/hooks';
import { useSettings } from '@/store/settings';
import { percentToGrade } from '@/lib/grading';

export function StudentProgress() {
  const { t, n, d, lang } = useI18n();
  const { data, student, today } = useActiveStudent();
  const bands = useSettings((s) => s.gradeBands);
  const [picked, setPicked] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const subjects = useMemo(() => (student ? studentSubjectIds(data, student.id) : []), [data, student]);
  const subjectId = pickSubject(subjects, picked);

  const calc = useMemo(() => {
    if (!student || !subjectId) return null;
    const current = overallMastery(studentTopicMastery(data, student.id, { today, subjectIds: [subjectId] }));
    const totals = assessmentTotals(data, student.id, { today, subjectId });
    const trend = overallTrend(data, student.id, { today, subjectId });
    const goal = goalFor(data, student.id, subjectId);
    const batchIds = student.batchIds.filter((b) => data.batches.find((x) => x.id === b)?.subjectIds.includes(subjectId));
    const att = attendanceRate(data, { batchIds, studentId: student.id, from: rangeStart('8w', today), to: today });
    const exams = data.assessments
      .filter((a) => a.subjectId === subjectId && a.date <= today && examStudents(data, a).some((s) => s.id === student.id))
      .map((a) => ({ a, pct: studentPct(a, student.id) }))
      .filter((x) => x.pct !== null)
      .sort((x, y) => y.a.date.localeCompare(x.a.date))
      .slice(0, 5);
    return { current, totals, goal, att, exams, progress: goal ? goalProgress(current, goal.targetPercent, trend) : null };
  }, [data, student, subjectId, today]);

  if (!student) return <Card className="text-center text-sm text-muted">{t('student.noStudents')}</Card>;
  const notes = data.messages.filter((m) => m.studentId === student.id).sort((a, b) => b.sentAt.localeCompare(a.sentAt)).slice(0, 2);
  const batchName = (id: string) => data.batches.find((b) => b.id === id)?.name ?? '';

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('student.progress.eyebrow')} title={t('page.student.progress.title')} desc={t('page.student.progress.desc')} aside={<Button variant="secondary" onClick={() => setReporting(true)}>{t('report.mine')}</Button>} />
      <SubjectSwitcher studentId={student.id} value={subjectId} onChange={setPicked} />

      {calc && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
            <StatCard i={1} icon={IconChart} label={t('student.progress.current')} value={Math.round(calc.current ?? 0)} suffix="%" hint={calc.current === null ? t('student.progress.noMarks') : t('student.progress.currentHint')} />
            <StatCard i={2} icon={IconTarget} label={t('student.progress.goal')} value={calc.goal?.targetPercent ?? 0} suffix="%" hint={calc.goal ? `${percentToGrade(calc.goal.targetPercent, bands).letter} · ${t(`goalStatus.${calc.progress?.status ?? 'no_data'}`)}` : t('studentDetail.noGoal')} />
            <div className="col-span-2 lg:col-span-1">
              <StatCard i={3} icon={IconCalendarCheck} label={t('common.attendance')} value={calc.att.pct ?? 0} suffix="%" hint={t('studentDetail.last8w')} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
            <Section title={t('student.progress.trend')} className="lg:col-span-2" i={4} action={<Chip tone="muted">{data.subjects.find((s) => s.id === subjectId)?.name[lang]}</Chip>}>
              {calc.totals.length < 2 ? (
                <p className="py-6 text-center text-sm text-muted">{t('studentDetail.trendNeed')}</p>
              ) : (
                <LineChart
                  data={calc.totals.map((p, i) => ({ label: `${t('common.testShort')}${n(i + 1)}`, value: Math.round(p.pct) }))}
                  goal={calc.goal?.targetPercent}
                  min={Math.max(0, Math.floor((Math.min(...calc.totals.map((p) => p.pct), calc.goal?.targetPercent ?? 100) - 10) / 10) * 10)}
                  max={Math.min(100, Math.ceil((Math.max(...calc.totals.map((p) => p.pct), calc.goal?.targetPercent ?? 0) + 10) / 10) * 10)}
                  ariaLabel={t('student.progress.trend')}
                />
              )}
            </Section>

            <Section title={t('student.progress.hereVsGoal')} i={5}>
              {calc.goal && calc.current !== null ? (
                <div className="flex flex-col items-center gap-5">
                  <Ring value={Math.round((calc.current / calc.goal.targetPercent) * 100)} size={128} stroke={12} label={`${n(Math.round(calc.current))}%`} sub={t('student.progress.of', { goal: `${n(calc.goal.targetPercent)}%` })} />
                  <div className="w-full space-y-2">
                    <ProgressBar value={calc.current} goal={calc.goal.targetPercent} />
                    <p className="text-center text-sm text-muted">{(calc.progress?.gap ?? 0) > 0 ? t('student.progress.gap', { gap: n(Math.round(calc.progress?.gap ?? 0)) }) : t('student.progress.reached')}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-center text-sm text-muted">
                  <p>{calc.goal ? t('student.progress.noMarks') : t('student.progress.setGoal')}</p>
                  {!calc.goal && <Link to="/student/goals" className="font-semibold text-brand-text hover:underline">{t('nav.student.goals')}</Link>}
                </div>
              )}
            </Section>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            <Section title={t('student.progress.recent')} i={6}>
              {calc.exams.length === 0 ? <p className="text-sm text-muted">{t('student.progress.noExams')}</p> : (
                <ul className="divide-y divide-line">
                  {calc.exams.map(({ a, pct }) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0"><span className="block truncate text-sm font-semibold">{lang === 'bn' && a.nameBn ? a.nameBn : a.name}</span><span className="block text-xs text-muted">{d(a.date)} · {batchName(a.batchId)}</span></span>
                      <MasteryPill pct={Math.round(pct as number)} />
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title={t('student.progress.feedback')} i={7} action={<Link to="/student/inbox" className="text-sm font-semibold text-brand-text hover:underline">{t('student.bar.inbox')}</Link>}>
              {notes.length === 0 ? <p className="text-sm text-muted">{t('student.progress.noNotes')}</p> : (
                <ul className="space-y-2.5">
                  {notes.map((m) => (
                    <li key={m.id}>
                      <blockquote className="rounded-2xl border border-line bg-surface-2 p-3.5 text-sm leading-relaxed">
                        {m.body}
                        <footer className="mt-1.5 text-xs text-muted">{data.profile.teacherName[lang]} · {d(m.sentAt.slice(0, 10))}</footer>
                      </blockquote>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </>
      )}
      <ReportSheet studentId={reporting ? student.id : null} readOnly onClose={() => setReporting(false)} />
    </div>
  );
}
