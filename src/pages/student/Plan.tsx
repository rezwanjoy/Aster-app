import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useI18n } from '@/i18n';
import { PageHeader } from '@/components/PageHeader';
import { Ring } from '@/components/charts';
import { Section } from '@/components/dashboard';
import { Reveal } from '@/components/motion';
import { Button, Card, Chip, IconButton, Segmented, UI_SPRING, cx } from '@/components/ui';
import { IconCheck, IconClock, IconFlame, IconMinus, IconPencil, IconSparkle } from '@/components/icons';
import { ToggleChip } from '@/components/forms';
import { ClassInfo } from '@/features/student/ClassInfo';
import { TaskForm } from '@/features/student/TaskForm';
import { addDays } from '@/lib/dates';
import { studentInsight, type NextStep } from '@/lib/insights';
import { nameOf } from '@/lib/names';
import { completedDays, currentStreak, longestStreak, weekDots, weeklyMinutes, type DotStatus } from '@/lib/streak';
import { regeneratePlan, setTaskDone, studentClasses, tasksForSubject } from '@/lib/tasks';
import { useData } from '@/store/data';
import { useActiveStudent } from '@/store/hooks';
import type { PlanTask } from '@/types';

type View = 'today' | 'week';

export function StudentPlan() {
  const { t, n, d, lang } = useI18n();
  const { data, student, today } = useActiveStudent();
  const [view, setView] = useState<View>('today');
  const [editing, setEditing] = useState<PlanTask | 'new' | null>(null);
  const [cls, setCls] = useState('all'); // "batchId|subjectId" or "all"

  const plan = data.plans.find((p) => p.studentId === student?.id);
  const tasks = plan?.tasks ?? [];
  const done = useMemo(() => (student ? completedDays(data.plans, student.id) : new Set<string>()), [data.plans, student]);
  const classes = useMemo(() => (student ? studentClasses(data, student.id) : []), [data, student]);
  const selected = classes.find((c) => `${c.batchId}|${c.subjectId}` === cls);
  const insight = useMemo(
    () => (student ? studentInsight(data, student.id, { today }, { subjectId: selected?.subjectId }) : null),
    [data, student, today, selected?.subjectId],
  );

  if (!student || !insight) return <Card className="text-center text-sm text-muted">{t('student.noStudents')}</Card>;

  const study = student.studyDays;
  const streak = currentStreak(done, study, today);
  const best = longestStreak(done, study, today);
  const dots = weekDots(done, study, today);
  const week = weeklyMinutes(tasks, today);
  const shown = tasksForSubject(data, tasks, selected?.subjectId);
  const todayTasks = shown.filter((x) => x.date === today);
  const comingUp = shown.filter((x) => x.date > today && x.date <= addDays(today, 6));
  const batchLabel = (id: string) => {
    const b = data.batches.find((x) => x.id === id);
    return b ? nameOf(b, lang) : '';
  };
  const doneMin = todayTasks.filter((x) => x.done).reduce((s, x) => s + x.minutes, 0);
  const totalMin = todayTasks.reduce((s, x) => s + x.minutes, 0);
  const topicName = (id?: string) => (id ? (data.topics.find((x) => x.id === id)?.name[lang] ?? '') : '');
  const subjectName = (id: string) => data.subjects.find((s) => s.id === id)?.name[lang] ?? id;
  const label = (x: PlanTask) => (x.kind === 'custom' ? `${x.title ?? ''}${x.topicId ? ` · ${topicName(x.topicId)}` : ''}` : `${t(`task.${x.kind}`)} · ${topicName(x.topicId)}`);
  const reason = (x: PlanTask) => (x.kind === 'custom' ? t('student.plan.ownTask') : x.reason ? t(`reasonTask.${x.reason}` as 'reasonTask.red') : '');
  const tip = (s: NextStep) => {
    switch (s.type) {
      case 'practice': return t('student.tip.practice', { topic: topicName(s.topicId) });
      case 'protectStrength': return t('student.tip.protect', { topic: topicName(s.topicId) });
      case 'attendance': return t('student.tip.attendance', { pct: n(s.pct) });
      case 'goal': return t('student.tip.goal', { subject: subjectName(s.subjectId) });
    }
  };
  const dotLabel: Record<DotStatus, string> = { done: t('student.dot.done'), missed: t('student.dot.missed'), rest: t('student.dot.rest'), today: t('student.dot.today'), upcoming: '' };
  const noPlan = tasks.length === 0;

  const row = (x: PlanTask) => {
    const on = x.done;
    return (
      <li key={x.id} className="flex items-center gap-2">
        <button
          type="button"
          role="checkbox"
          aria-checked={on}
          onClick={() => useData.getState().apply((dd) => setTaskDone(dd, student.id, x.id, !on, today))}
          className={cx('press flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 text-left', on ? 'border-line bg-brand-soft' : 'border-line bg-surface-2 hover:border-line-strong')}
        >
          <span className={cx('flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300', on ? 'border-transparent bg-linear-to-br from-[#7c5cff] to-[#4a2cc0] text-white' : 'border-line-strong')}>
            <AnimatePresence initial={false}>
              {on && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={UI_SPRING}>
                  <IconCheck width={16} height={16} strokeWidth={3} />
                </motion.span>
              )}
            </AnimatePresence>
          </span>
          <span className="min-w-0 flex-1">
            <span className={cx('block text-sm leading-snug font-semibold', on && 'text-muted line-through')}>{label(x)}</span>
            <span className="block text-xs text-muted">{reason(x)}</span>
          </span>
          <span className="num shrink-0 text-xs font-semibold text-muted">{n(x.minutes)} {t('common.min')}</span>
        </button>
        <IconButton label={t('student.plan.editTask', { name: label(x) })} className="shrink-0 border border-line-strong" onClick={() => setEditing(x)}>
          <IconPencil width={18} height={18} />
        </IconButton>
      </li>
    );
  };

  const byDate = comingUp.reduce<Record<string, PlanTask[]>>((acc, x) => ({ ...acc, [x.date]: [...(acc[x.date] ?? []), x] }), {});

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('student.plan.eyebrow')}
        title={t('student.plan.greeting', { name: nameOf(student, lang).split(' ')[0] })}
        desc={t('student.plan.desc')}
        aside={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setEditing('new')}>+ {t('student.plan.addTask')}</Button>
            <Button onClick={() => useData.getState().apply((dd) => regeneratePlan(dd, student.id, today))}><IconSparkle width={16} height={16} /> {t('student.plan.update')}</Button>
          </div>
        }
      />

      <div className="space-y-3">
        {classes.length > 1 && (
          <div role="group" aria-label={t('student.class.choose')} className="flex flex-wrap gap-2">
            <ToggleChip on={!selected} onClick={() => setCls('all')}>{t('student.class.all')}</ToggleChip>
            {classes.map((c) => (
              <ToggleChip key={`${c.batchId}|${c.subjectId}`} on={`${c.batchId}|${c.subjectId}` === cls} onClick={() => setCls(`${c.batchId}|${c.subjectId}`)}>
                {subjectName(c.subjectId)} · {batchLabel(c.batchId)}
              </ToggleChip>
            ))}
          </div>
        )}
        <ClassInfo data={data} studentId={student.id} batchId={selected?.batchId} subjectId={selected?.subjectId} today={today} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-6">
        <Reveal i={1} className="lg:col-span-2">
          <Card hero className="space-y-6 p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="min-w-0 space-y-3">
                <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-[#f1e2bd] uppercase"><IconFlame width={16} height={16} /> {t('student.plan.streak')}</p>
                <p className="font-display text-5xl font-semibold tracking-[-0.03em]">
                  <span className="num">{n(streak)}</span>
                  <span className="ml-2 text-xl font-medium text-white/80">{t('student.plan.days')}</span>
                </p>
                <p className="text-sm text-white/85">{t('student.plan.best', { n: n(best) })}</p>
              </div>
              <Ring value={week.pct} size={124} stroke={12} label={`${n(week.pct)}%`} sub={t('student.plan.week')} />
            </div>
            <ol className="flex justify-between gap-1.5" aria-label={t('student.plan.last7')}>
              {dots.map((dot) => (
                <li key={dot.date} className="flex flex-1 flex-col items-center gap-1.5">
                  <span
                    role="img"
                    aria-label={`${d(dot.date, { weekday: 'long' })}: ${dotLabel[dot.status]}`}
                    className={cx(
                      'flex size-9 items-center justify-center rounded-full border-2 text-xs',
                      dot.status === 'done' && 'border-transparent bg-[#e3c98f] text-[#3a1fa0]',
                      dot.status === 'missed' && 'border-white/40 text-white/80',
                      dot.status === 'rest' && 'border-white/20 text-white/50',
                      dot.status === 'today' && 'border-[#e3c98f] text-[#f6e7c1] ring-4 ring-white/15',
                    )}
                  >
                    {dot.status === 'done' ? <IconCheck width={16} height={16} strokeWidth={3} /> : dot.status === 'rest' ? <IconMinus width={14} height={14} /> : dot.status === 'missed' ? '×' : '•'}
                  </span>
                  <span className="text-[11px] text-white/75">{d(dot.date, { weekday: 'short' })}</span>
                </li>
              ))}
            </ol>
          </Card>
        </Reveal>

        <Section
          title={t('student.plan.tasks')}
          className="lg:col-span-3"
          i={2}
          action={view === 'today' ? <Chip tone="brand"><IconClock width={13} height={13} />{n(doneMin)}/{n(totalMin)} {t('common.min')}</Chip> : undefined}
        >
          <Segmented<View> label={t('student.plan.tasks')} value={view} onChange={setView} className="mb-4 w-full" options={[{ value: 'today', label: t('common.today') }, { value: 'week', label: t('student.plan.thisWeek') }]} />
          {noPlan ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted">{t('student.plan.empty')}</p>
              <Button onClick={() => useData.getState().apply((dd) => regeneratePlan(dd, student.id, today))}>{t('student.plan.create')}</Button>
            </div>
          ) : view === 'today' ? (
            todayTasks.length === 0 ? (
              <p className="text-sm text-muted">{t('student.plan.noneToday')}</p>
            ) : (
              <>
                <ul className="space-y-2.5">{todayTasks.map(row)}</ul>
                <AnimatePresence>
                  {todayTasks.every((x) => x.done) && (
                    <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 flex items-center gap-2 text-sm font-medium text-gold">
                      <IconSparkle width={16} height={16} /> {t('student.plan.allDone')}
                    </motion.p>
                  )}
                </AnimatePresence>
              </>
            )
          ) : Object.keys(byDate).length === 0 ? (
            <p className="text-sm text-muted">{t('student.plan.noneWeek')}</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(byDate).map(([date, list]) => (
                <div key={date} className="space-y-2">
                  <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{d(date, { weekday: 'long', day: 'numeric', month: 'short' })}</h3>
                  <ul className="space-y-2.5">{list.map(row)}</ul>
                </div>
              ))}
            </div>
          )}
          {plan?.aiNote && <p className="mt-4 rounded-2xl border border-line bg-surface-2 p-3 text-sm">{plan.aiNote}</p>}
        </Section>
      </div>

      <Section title={t('student.plan.tips')} i={3} action={<Chip tone="gold">{t('student.plan.tipsBasic')}</Chip>}>
        {insight.nextSteps.length === 0 ? (
          <p className="text-sm text-muted">{t('student.plan.tipsEmpty')}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {insight.nextSteps.slice(0, 3).map((s, i) => (
              <li key={i} className="flex gap-3 rounded-2xl border border-line bg-surface-2 p-3.5 text-sm">
                <IconSparkle width={18} height={18} className="mt-0.5 shrink-0 text-gold" />
                {tip(s)}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted">
          {t('student.plan.tipsNote')} <Link to="/student/goals" className="font-semibold text-brand-text hover:underline">{t('student.plan.changeGoals')}</Link>
        </p>
      </Section>

      <TaskForm open={editing !== null} studentId={student.id} task={editing === 'new' ? null : editing} today={today} onClose={() => setEditing(null)} />
    </div>
  );
}
