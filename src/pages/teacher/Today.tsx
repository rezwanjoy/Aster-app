import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBase } from '@/app/useBase';
import { useI18n } from '@/i18n';
import { PageHeader } from '@/components/PageHeader';
import { BarChart } from '@/components/charts';
import { MasteryPill, PersonRow, Section, StatCard, TopicBar } from '@/components/dashboard';
import { Button, Card, Chip, IconButton, Segmented } from '@/components/ui';
import { Reveal } from '@/components/motion';
import { IconBell, IconCalendarCheck, IconChart, IconChevronRight, IconClock, IconPencil, IconSparkle, IconUsers, IconWallet } from '@/components/icons';
import { StatDetailSheet, type StatTab } from '@/features/teacher/StatDetailSheet';
import { LockedCard } from '@/features/premium/LockedCard';
import { MessageSheet } from '@/features/teacher/MessageSheet';
import { LogClassSheet } from '@/features/teacher/LogClassSheet';
import { StudentForm } from '@/features/teacher/StudentForm';
import { BatchForm } from '@/features/teacher/BatchForm';
import { weeklyAttendance, weeksIn, type AttendanceRange } from '@/lib/attendance';
import { batchTopicStats, nextClass, reteachTopics, scopeSummary, studentsNeedingAttention, type AttentionReason } from '@/lib/batch';
import { addDays, diffDays } from '@/lib/dates';
import { useAppData, useScope } from '@/store/hooks';

export function TeacherToday() {
  const { t, n, d, time, lang } = useI18n();
  const base = useBase();
  const navigate = useNavigate();
  const data = useAppData();
  const { batchIds, batches, today } = useScope();
  const [range, setRange] = useState<AttendanceRange>('4w');
  const [stat, setStat] = useState<StatTab | null>(null);
  const [logging, setLogging] = useState(false);
  const [addStudent, setAddStudent] = useState(false);
  const [addBatch, setAddBatch] = useState(false);
  const [message, setMessage] = useState<{ id: string; reasons: AttentionReason[]; batchIds: string[] } | null>(null);

  const ctx = useMemo(() => ({ today }), [today]);
  const term = data.terms.find((x) => x.id === data.currentTermId);
  const summary = useMemo(() => scopeSummary(data, batchIds, ctx), [data, batchIds, ctx]);
  const stats = useMemo(() => batchTopicStats(data, batchIds, ctx).filter((x) => x.withData > 0), [data, batchIds, ctx]);
  const reteach = useMemo(() => new Set(reteachTopics(stats).map((x) => x.topicId)), [stats]);
  const attention = useMemo(() => studentsNeedingAttention(data, batchIds, ctx), [data, batchIds, ctx]);
  const weeks = weeksIn(range, today, term);
  const series = useMemo(() => weeklyAttendance(data, batchIds, today, weeks), [data, batchIds, today, weeks]);

  const upcoming = useMemo(
    () =>
      batches
        .map((b) => ({ b, next: nextClass(data, b.id, today) }))
        .filter((x) => x.next)
        .sort((x, y) => (x.next!.date + (x.next!.time ?? '')).localeCompare(y.next!.date + (y.next!.time ?? '')))[0],
    [data, batches, today],
  );
  const when = (date: string, tm?: string) => {
    const diff = diffDays(date, today);
    const day = diff === 0 ? t('common.today') : diff === 1 ? t('common.tomorrow') : d(date, { weekday: 'long', day: 'numeric', month: 'short' });
    return tm ? `${day}, ${time(tm)}` : day;
  };
  const nm = (s: { name: string; nameBn?: string }) => (lang === 'bn' && s.nameBn ? s.nameBn : s.name);
  const bName = (b: { name: string; nameBn?: string }) => (lang === 'bn' && b.nameBn ? b.nameBn : b.name);
  const topicName = (id: string) => data.topics.find((x) => x.id === id)?.name[lang] ?? id;
  const values = series.map((w) => w.pct ?? 0);
  const floor = Math.max(0, Math.floor((Math.min(...values.filter((v) => v > 0), 100) - 15) / 10) * 10);

  const termDay = term ? Math.min(diffDays(addDays(today, 0), term.startDate) + 1, diffDays(term.endDate, term.startDate) + 1) : 0;

  if (data.batches.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow={term?.name} title={t('teacher.today.greeting', { name: data.profile.teacherName[lang] })} desc={t('teacher.today.desc')} />
        <Card className="space-y-3 text-center">
          <p className="font-display text-lg font-semibold">{t('teacher.empty.title')}</p>
          <p className="mx-auto max-w-md text-sm text-muted">{t('teacher.empty.body')}</p>
          <div><Button onClick={() => setAddBatch(true)}>{t('batches.add')}</Button></div>
        </Card>
        {addBatch && <BatchForm open batch={null} onClose={() => setAddBatch(false)} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={term ? `${lang === 'bn' && term.nameBn ? term.nameBn : term.name}` : undefined}
        title={t('teacher.today.greeting', { name: data.profile.teacherName[lang] })}
        desc={term ? t('teacher.today.termLine', { day: n(Math.max(1, termDay)), total: n(diffDays(term.endDate, term.startDate) + 1) }) : t('teacher.today.desc')}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <Reveal i={0} className="lg:col-span-2">
          <Card hero className="flex h-full flex-col justify-between gap-8 p-5 sm:p-7">
            {upcoming ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.14em] text-[#f1e2bd] uppercase">
                      <IconClock width={14} height={14} /> {t('teacher.today.nextClass')}
                    </p>
                    <h2 className="font-display mt-2 text-2xl leading-tight font-semibold tracking-[-0.025em] sm:text-3xl">{bName(upcoming.b)}</h2>
                    <p className="mt-1 text-white/80">{when(upcoming.next!.date, upcoming.next!.time)}</p>
                  </div>
                  <span aria-hidden="true" className="hidden h-10 w-14 shrink-0 rounded-lg bg-linear-to-br from-[#f6e7c1] to-[#c9a45a] opacity-90 shadow-inner sm:block" />
                </div>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <ClassFacts batchId={upcoming.b.id} />
                  <div className="flex flex-wrap gap-2">
                    <Link to={`${base}/batches/${upcoming.b.id}`} className="press inline-flex min-h-11 items-center gap-1 rounded-2xl bg-white/15 px-4 text-sm font-semibold hover:bg-white/25">
                      {t('batches.open')} <IconChevronRight width={16} height={16} />
                    </Link>
                    <button type="button" onClick={() => setLogging(true)} className="press inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-[#2d1580] hover:bg-white/90">
                      <IconPencil width={16} height={16} /> {t('logClass.cta')}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-white/85">{t('teacher.today.noClasses')}</p>
            )}
          </Card>
        </Reveal>

        <Section title={t('teacher.today.quick')} i={1}>
          <ul className="grid gap-2">
            {[
              { icon: IconPencil, label: t('logClass.cta'), run: () => setLogging(true) },
              { icon: IconChart, label: t('teacher.today.qMarks'), run: () => navigate(`${base}/marks`) },
              { icon: IconUsers, label: t('students.add'), run: () => setAddStudent(true) },
            ].map(({ icon: Icon, label, run }) => (
              <li key={label}>
                <button type="button" onClick={run} className="press group flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface-2 px-3 text-left hover:border-line-strong">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand-text"><Icon width={18} height={18} /></span>
                  <span className="flex-1 text-sm font-medium">{label}</span>
                  <IconChevronRight width={16} height={16} className="text-muted transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        <StatCard i={2} icon={IconUsers} label={t('common.students')} value={summary.students} hint={t('teacher.today.batchesHint', { n: n(summary.batches) })} onClick={() => setStat('students')} />
        <StatCard i={3} icon={IconCalendarCheck} label={t('common.attendance')} value={summary.attendancePct ?? 0} suffix="%" hint={t('teacher.today.last4w')} onClick={() => setStat('attendance')} />
        <StatCard i={4} icon={IconChart} label={t('common.mastery')} value={Math.round(summary.avgMastery ?? 0)} suffix="%" hint={t('teacher.today.avgAll')} onClick={() => setStat('mastery')} />
        <StatCard i={5} icon={IconWallet} label={t('teacher.today.feesDue')} value={summary.feesOwed} prefix="৳" hint={t('teacher.today.openFees')} onClick={() => navigate(`${base}/fees`)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <Section
          title={t('teacher.today.attendanceChart')}
          className="lg:col-span-2"
          i={6}
          action={
            <Segmented<AttendanceRange>
              label={t('teacher.today.range')}
              value={range}
              onChange={setRange}
              options={[
                { value: '4w', label: t('teacher.today.range4') },
                { value: '8w', label: t('teacher.today.range8') },
                { value: 'term', label: t('teacher.today.rangeTerm') },
              ]}
            />
          }
        >
          {series.some((w) => w.total > 0) ? (
            <BarChart
              key={`${range}-${batchIds.join()}`}
              data={series.map((w, i) => ({ label: `${t('common.weekShort')}${n(i + 1)}`, value: w.pct ?? 0 }))}
              average={summary.attendancePct ?? undefined}
              min={floor}
              ariaLabel={t('teacher.today.attendanceChart')}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted">{t('teacher.today.noAttendance')}</p>
          )}
        </Section>

        <Section title={t('teacher.today.weakTopics')} i={7}>
          {stats.length === 0 ? (
            <p className="text-sm text-muted">{t('teacher.today.noMarks')}</p>
          ) : (
            <ul className="space-y-3.5">
              {stats.slice(0, 4).map((tp, i) => (
                <TopicBar key={tp.topicId} i={i} name={topicName(tp.topicId)} value={tp.redPct} valueLabel={`${n(tp.redPct)}%`} tone={tp.redPct >= 40 ? 'red' : tp.redPct >= 20 ? 'yellow' : 'green'} />
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted">{reteach.size ? t('teacher.today.reteachNote', { n: n(reteach.size) }) : t('teacher.today.weakNote')}</p>
        </Section>
      </div>

      <Section title={t('teacher.today.attention')} i={8} action={<Link to={`${base}/insights`} className="text-sm font-semibold text-brand-text hover:underline">{t('common.viewAll')}</Link>}>
        {attention.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted"><IconSparkle width={16} height={16} className="text-gold" /> {t('teacher.today.allGood')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {attention.slice(0, 4).map((a) => {
              const s = data.students.find((x) => x.id === a.studentId)!;
              return (
                <PersonRow
                  key={a.studentId}
                  name={nm(s)}
                  to={`${base}/students/${s.id}`}
                  meta={
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>{a.reasons.map((r) => t(`reason.${r}`)).join(' · ')}</span>
                      {a.feeLate && <Chip tone="gold">{t('reason.feeLate')}</Chip>}
                      <span className="text-muted">· {a.batchIds.map((id) => { const b = data.batches.find((x) => x.id === id); return b ? bName(b) : ''; }).join(', ')}</span>
                    </span>
                  }
                  right={
                    <span className="flex items-center gap-1">
                      {a.mastery !== null && <MasteryPill pct={Math.round(a.mastery)} />}
                      <IconButton label={t('message.to', { student: nm(s) })} className="border border-line-strong" onClick={() => setMessage({ id: a.studentId, reasons: a.reasons, batchIds: a.batchIds })}>
                        <IconBell width={20} height={20} />
                      </IconButton>
                    </span>
                  }
                />
              );
            })}
          </ul>
        )}
      </Section>

      <Reveal i={9}><LockedCard id="recorder" /></Reveal>

      <StatDetailSheet open={stat !== null} initial={stat ?? 'students'} onClose={() => setStat(null)} />
      <MessageSheet studentId={message?.id ?? null} reasons={message?.reasons} batchIds={message?.batchIds} onClose={() => setMessage(null)} />
      <LogClassSheet open={logging} batchId={upcoming?.b.id ?? batches[0]?.id} today={today} onClose={() => setLogging(false)} />
      {addStudent && <StudentForm open student={null} defaultBatchId={batches[0]?.id} onClose={() => setAddStudent(false)} />}
    </div>
  );
}

/** Students / attendance / mastery for one batch, shown on the hero card. */
function ClassFacts({ batchId }: { batchId: string }) {
  const { t, n } = useI18n();
  const data = useAppData();
  const { today } = useScope();
  const s = useMemo(() => scopeSummary(data, [batchId], { today }), [data, batchId, today]);
  const items: [string, string][] = [
    [t('common.students'), n(s.students)],
    [t('common.attendance'), s.attendancePct === null ? '–' : `${n(s.attendancePct)}%`],
    [t('common.mastery'), s.avgMastery === null ? '–' : `${n(Math.round(s.avgMastery))}%`],
  ];
  return (
    <dl className="flex gap-6">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-white/70">{label}</dt>
          <dd className="num font-display text-xl font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
