import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n';
import { PageHeader } from '@/components/PageHeader';
import { ProgressBar } from '@/components/charts';
import { Section } from '@/components/dashboard';
import { DayPicker } from '@/components/forms';
import { Reveal } from '@/components/motion';
import { Button, Card, Chip, IconButton } from '@/components/ui';
import { IconSparkle, IconTarget } from '@/components/icons';
import { GoalForm } from '@/features/student/GoalForm';
import { goalFor, saveStudySettings } from '@/lib/goals';
import { formatGrade } from '@/lib/grading';
import { goalProgress, overallMastery, overallTrend, studentTopicMastery } from '@/lib/mastery';
import { nameOf } from '@/lib/names';
import { studentSubjectIds } from '@/lib/scope';
import { regeneratePlan } from '@/lib/tasks';
import { useData } from '@/store/data';
import { useActiveStudent } from '@/store/hooks';
import { useSettings } from '@/store/settings';

export function StudentGoals() {
  const { t, n, d, lang } = useI18n();
  const { data, student, today } = useActiveStudent();
  const scale = useSettings((s) => s.gradingScale);
  const [editing, setEditing] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);
  const subjects = useMemo(() => (student ? studentSubjectIds(data, student.id) : []), [data, student]);

  if (!student) return <Card className="text-center text-sm text-muted">{t('student.noStudents')}</Card>;
  const setStudy = (change: { studyDays?: number[]; dailyMinutes?: number }) => {
    setUpdated(false);
    useData.getState().apply((dd) => saveStudySettings(dd, student.id, { studyDays: change.studyDays ?? student.studyDays, dailyMinutes: change.dailyMinutes ?? student.dailyMinutes }));
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('student.goals.eyebrow')} title={t('page.student.goals.title')} desc={t('page.student.goals.desc')} />

      {subjects.length === 0 && <Card className="text-center text-sm text-muted">{t('student.noSubjects')}</Card>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {subjects.map((sid, i) => {
          const goal = goalFor(data, student.id, sid);
          const subject = data.subjects.find((s) => s.id === sid)?.name[lang] ?? sid;
          const batches = data.batches.filter((b) => student.batchIds.includes(b.id) && b.subjectIds.includes(sid));
          const current = overallMastery(studentTopicMastery(data, student.id, { today, subjectIds: [sid] }));
          const progress = goal ? goalProgress(current, goal.targetPercent, overallTrend(data, student.id, { today, subjectId: sid })) : null;
          return (
            <Reveal key={sid} i={i + 1}>
              <Card hero={i === 0 && !!goal} className="h-full space-y-5 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={i === 0 && goal ? 'text-xs font-semibold tracking-[0.14em] text-[#f1e2bd] uppercase' : 'text-xs font-semibold tracking-[0.14em] text-gold uppercase'}>{subject}</p>
                    <p className="mt-0.5 text-xs text-muted">{student.className} · {batches.map((b) => nameOf(b, lang)).join(', ')}</p>
                  </div>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-text"><IconTarget width={22} height={22} /></span>
                </div>
                {goal ? (
                  <>
                    <div>
                      <p className="font-display text-5xl font-semibold tracking-[-0.03em]">{scale === 'percent' ? `${n(goal.targetPercent)}%` : formatGrade(goal.targetPercent, scale)}</p>
                      <p className="mt-1 text-sm text-muted">{goal.targetLabel} · ≥ {n(goal.targetPercent)}%{goal.byDate ? ` · ${t('student.goals.by', { date: d(goal.byDate) })}` : ''}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between gap-2 text-sm">
                        <span>{current === null ? t('student.progress.noMarks') : t('student.goals.now', { pct: n(Math.round(current)) })}</span>
                        {progress && <Chip tone={progress.status === 'on_track' ? 'brand' : 'gold'}>{t(`goalStatus.${progress.status}`)}</Chip>}
                      </div>
                      <ProgressBar value={current ?? 0} goal={goal.targetPercent} />
                      {progress?.gap ? <p className="text-xs text-muted">{t('student.progress.gap', { gap: n(Math.round(progress.gap)) })}</p> : null}
                    </div>
                    <Button variant="secondary" onClick={() => setEditing(sid)}>{t('student.goals.edit')}</Button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted">{t('student.goals.none')}</p>
                    <Button onClick={() => setEditing(sid)}>{t('student.goals.set')}</Button>
                  </div>
                )}
              </Card>
            </Reveal>
          );
        })}
      </div>

      <Section title={t('student.goals.study')} i={subjects.length + 2}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('student.goals.studyDays')}</p>
            <DayPicker value={student.studyDays} onChange={(days) => setStudy({ studyDays: days })} label={t('student.goals.studyDays')} />
            <p className="text-xs text-muted">{t('student.goals.daysCount', { n: n(student.studyDays.length) })}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('student.goals.daily')}</p>
            <div className="flex items-center gap-4">
              <IconButton label={t('student.goals.less')} onClick={() => setStudy({ dailyMinutes: student.dailyMinutes - 5 })} className="border border-line-strong text-xl">−</IconButton>
              <p className="font-display text-4xl font-semibold tracking-[-0.03em]"><span className="num">{n(student.dailyMinutes)}</span><span className="ml-2 text-base font-medium text-muted">{t('common.min')}</span></p>
              <IconButton label={t('student.goals.more')} onClick={() => setStudy({ dailyMinutes: student.dailyMinutes + 5 })} className="border border-line-strong text-xl">+</IconButton>
            </div>
            <p className="text-xs text-muted">{t('student.goals.weekTotal', { min: n(student.dailyMinutes * student.studyDays.length) })}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <Button onClick={() => { useData.getState().apply((dd) => regeneratePlan(dd, student.id, today)); setUpdated(true); }}>
            <IconSparkle width={16} height={16} /> {t('student.plan.update')}
          </Button>
          <p role="status" aria-live="polite" className={updated ? 'text-sm font-medium text-green-fg' : 'text-xs text-muted'}>{updated ? t('student.goals.planUpdated') : t('student.goals.updateHint')}</p>
        </div>
      </Section>

      {editing && <GoalForm open studentId={student.id} subjectId={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
