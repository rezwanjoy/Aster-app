import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useBase } from '@/app/useBase';
import { useI18n } from '@/i18n';
import { formatMonth } from '@/i18n/format';
import { PageHeader } from '@/components/PageHeader';
import { LineChart, ProgressBar } from '@/components/charts';
import { MasteryPill, Section, StatCard, Trend } from '@/components/dashboard';
import { ToggleChip } from '@/components/forms';
import { Reveal } from '@/components/motion';
import { Button, Card, Chip, MasteryBadge, type MasteryBand } from '@/components/ui';
import { IconAlert, IconBell, IconCalendarCheck, IconChart, IconChevronRight, IconPencil, IconSparkle, IconTarget, IconWallet } from '@/components/icons';
import { StudentAiCard } from '@/features/ai/AiCards';
import { MessageSheet } from '@/features/teacher/MessageSheet';
import { ReportSheet } from '@/features/shared/ReportSheet';
import { StudentForm } from '@/features/teacher/StudentForm';
import { attendanceRate, rangeStart } from '@/lib/attendance';
import { feeStatus, feesFor, remaining, type FeeStatus } from '@/lib/fees';
import { studentInsight, type NextStep } from '@/lib/insights';
import { assessmentTotals, studentTopicMastery } from '@/lib/mastery';
import { nameOf } from '@/lib/names';
import { studentSubjectIds } from '@/lib/scope';
import { whatsappLink } from '@/lib/whatsapp';
import { useAppData, useToday } from '@/store/hooks';
import { useSettings } from '@/store/settings';
import { percentToGrade } from '@/lib/grading';

const feeBand: Record<FeeStatus, MasteryBand> = { paid: 'green', partial: 'yellow', due: 'unknown', overdue: 'red' };

/** One student, in depth: weak-topic map, marks trend, attendance, fees, goals and next steps. */
export function TeacherStudentDetail() {
  const { id = '' } = useParams();
  const { t, n, d, lang } = useI18n();
  const base = useBase();
  const navigate = useNavigate();
  const data = useAppData();
  const today = useToday();
  const banglaNumerals = useSettings((s) => s.banglaNumerals);
  const bands = useSettings((s) => s.gradeBands);
  const student = data.students.find((s) => s.id === id);
  const [subjectPick, setSubjectPick] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [reporting, setReporting] = useState(false);

  const subjects = useMemo(() => studentSubjectIds(data, id), [data, id]);
  const subjectId = subjectPick && subjects.includes(subjectPick) ? subjectPick : subjects[0];
  const ctx = useMemo(() => ({ today }), [today]);

  const masteries = useMemo(
    () => (student && subjectId ? studentTopicMastery(data, id, { today, subjectIds: [subjectId] }) : []),
    [data, id, today, subjectId, student],
  );
  const insight = useMemo(() => (student ? studentInsight(data, id, ctx, { subjectId }) : null), [data, id, ctx, subjectId, student]);
  const totals = useMemo(() => (student ? assessmentTotals(data, id, { today, subjectId }) : []), [data, id, today, subjectId, student]);

  if (!student || !insight) {
    return (
      <Card className="space-y-3 text-center">
        <p className="font-display text-lg font-semibold">{t('studentDetail.notFound')}</p>
        <div><Link to={`${base}/batches`} className="font-semibold text-brand-text hover:underline">{t('batches.back')}</Link></div>
      </Card>
    );
  }

  const topicName = (tid: string) => data.topics.find((x) => x.id === tid)?.name[lang] ?? tid;
  const subjectName = (sid: string) => data.subjects.find((s) => s.id === sid)?.name[lang] ?? sid;
  const batchName = (bid: string) => {
    const b = data.batches.find((x) => x.id === bid);
    return b ? nameOf(b, lang) : '';
  };
  const records = feesFor(data, { batchIds: student.batchIds, studentId: id }).sort((a, b) => b.month.localeCompare(a.month));
  const owed = records.reduce((s, f) => s + remaining(f), 0);
  const att = attendanceRate(data, { batchIds: student.batchIds, studentId: id, from: rangeStart('8w', today), to: today });
  const goal = insight.goals.find((g) => g.subjectId === subjectId);
  const sorted = [...masteries].sort((a, b) => (a.mastery ?? 101) - (b.mastery ?? 101));
  const stepText = (s: NextStep): string => {
    switch (s.type) {
      case 'practice': return t('studentDetail.step.practice', { topic: topicName(s.topicId) });
      case 'protectStrength': return t('studentDetail.step.protect', { topic: topicName(s.topicId) });
      case 'attendance': return t('studentDetail.step.attendance', { pct: n(s.pct) });
      case 'goal': return t('studentDetail.step.goal', { subject: subjectName(s.subjectId) });
    }
  };

  return (
    <div className="space-y-6">
      <button type="button" onClick={() => navigate(-1)} className="inline-flex min-h-11 cursor-pointer items-center gap-1 text-sm font-semibold text-brand-text hover:underline">
        <IconChevronRight width={16} height={16} className="rotate-180" /> {t('common.back')}
      </button>

      <PageHeader
        eyebrow={`${student.className} · ${student.batchIds.map(batchName).join(', ')}`}
        title={nameOf(student, lang)}
        desc={student.guardianName ? t('studentDetail.guardianLine', { name: student.guardianName, phone: student.guardianPhone ?? '–' }) : undefined}
        aside={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}><IconPencil width={16} height={16} /> {t('common.edit')}</Button>
            <a href={whatsappLink(student.guardianPhone, '')} target="_blank" rel="noopener noreferrer" className="press inline-flex min-h-11 items-center justify-center rounded-2xl border border-line-strong bg-glass px-5 text-sm font-semibold hover:bg-surface-2">
              {t('studentDetail.whatsapp')}
            </a>
            <Button variant="secondary" onClick={() => setMessaging(true)}><IconBell width={16} height={16} /> {t('studentDetail.message')}</Button>
            <Button onClick={() => setReporting(true)}>{t('report.open')}</Button>
          </div>
        }
      />

      {subjects.length > 1 && (
        <div role="group" aria-label={t('studentDetail.subject')} className="flex flex-wrap gap-2">
          {subjects.map((sid) => <ToggleChip key={sid} on={sid === subjectId} onClick={() => setSubjectPick(sid)}>{subjectName(sid)}</ToggleChip>)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        <StatCard i={1} icon={IconChart} label={t('common.mastery')} value={Math.round(insight.overall ?? 0)} suffix="%" hint={subjectId ? subjectName(subjectId) : undefined} />
        <StatCard i={2} icon={IconCalendarCheck} label={t('common.attendance')} value={att.pct ?? 0} suffix="%" hint={t('studentDetail.last8w')} />
        <StatCard i={3} icon={IconWallet} label={t('studentDetail.feesOwed')} value={owed} prefix="৳" hint={owed ? t('studentDetail.feesOpen') : t('studentDetail.feesClear')} />
        <StatCard i={4} icon={IconTarget} label={t('studentDetail.goal')} value={goal?.target ?? 0} suffix="%" hint={goal ? `${percentToGrade(goal.target, bands).letter} · ${t(`goalStatus.${goal.status}`)}` : t('studentDetail.noGoal')} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-6">
        <Section title={t('studentDetail.map')} className="lg:col-span-3" i={5}>
          {sorted.length === 0 ? <p className="text-sm text-muted">{t('studentDetail.noTopics')}</p> : (
            <ul className="grid grid-cols-1 gap-2.5">
              {sorted.map((m) => (
                <li key={m.topicId} className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-surface-2 px-3.5 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{topicName(m.topicId)}</span>
                    {m.trend !== 'flat' && <Trend trend={m.trend} />}
                  </span>
                  {m.mastery === null ? <Chip tone="muted">{t('mastery.unknown')}</Chip> : <MasteryPill pct={Math.round(m.mastery)} />}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={t('studentDetail.trend')} className="lg:col-span-2" i={6}>
          {totals.length < 2 ? <p className="text-sm text-muted">{t('studentDetail.trendNeed')}</p> : (
            <LineChart
              data={totals.map((p, i) => ({ label: `${t('common.testShort')}${n(i + 1)}`, value: Math.round(p.pct) }))}
              goal={goal?.target}
              min={Math.max(0, Math.floor((Math.min(...totals.map((p) => p.pct), goal?.target ?? 100) - 10) / 10) * 10)}
              max={Math.min(100, Math.ceil((Math.max(...totals.map((p) => p.pct), goal?.target ?? 0) + 10) / 10) * 10)}
              ariaLabel={t('studentDetail.trend')}
            />
          )}
        </Section>
      </div>

      <Section title={t('studentDetail.insight')} i={7}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted uppercase"><IconSparkle width={14} height={14} className="text-gold" />{t('studentDetail.strengths')}</h3>
            {insight.strengths.length === 0 ? <p className="text-sm text-muted">{t('studentDetail.none')}</p> : (
              <ul className="space-y-1.5">{insight.strengths.map((m) => <li key={m.topicId} className="flex items-center justify-between gap-2 text-sm"><span className="truncate">{topicName(m.topicId)}</span><MasteryPill pct={Math.round(m.mastery as number)} /></li>)}</ul>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted uppercase"><IconAlert width={14} height={14} />{t('studentDetail.weakSpots')}</h3>
            {insight.weakSpots.length === 0 ? <p className="text-sm text-muted">{t('studentDetail.none')}</p> : (
              <ul className="space-y-1.5">{insight.weakSpots.map((m) => <li key={m.topicId} className="flex items-center justify-between gap-2 text-sm"><span className="truncate">{topicName(m.topicId)}</span><MasteryPill pct={Math.round(m.mastery as number)} /></li>)}</ul>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{t('studentDetail.nextSteps')}</h3>
            {insight.nextSteps.length === 0 ? <p className="text-sm text-muted">{t('studentDetail.none')}</p> : (
              <ul className="space-y-1.5">{insight.nextSteps.map((s, i) => <li key={i} className="rounded-xl border border-line bg-surface-2 p-2.5 text-sm">{stepText(s)}</li>)}</ul>
            )}
          </div>
        </div>
      </Section>

      <StudentAiCard studentId={id} subjectId={subjectId} today={today} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <Section title={t('studentDetail.attendanceByBatch')} i={8}>
          <ul className="space-y-4">
            {student.batchIds.map((bid) => {
              const r = attendanceRate(data, { batchIds: [bid], studentId: id, from: rangeStart('8w', today), to: today });
              return (
                <li key={bid} className="space-y-1.5">
                  <div className="flex justify-between gap-2 text-sm"><span className="truncate">{batchName(bid)}</span><span className="num font-semibold">{r.pct === null ? '–' : `${n(r.pct)}%`}</span></div>
                  <ProgressBar value={r.pct ?? 0} goal={75} />
                  <p className="text-xs text-muted">{r.total ? t('stats.classesCount', { a: n(r.attended), t: n(r.total) }) : t('teacher.today.noAttendance')}</p>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section title={t('studentDetail.fees')} i={9}>
          {records.length === 0 ? <p className="text-sm text-muted">{t('fees.none')}</p> : (
            <ul className="divide-y divide-line">
              {records.map((f) => {
                const status = feeStatus(f, today);
                return (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{formatMonth(f.month, lang, banglaNumerals)}</span>
                      <span className="block truncate text-xs text-muted">{batchName(f.batchId)} · ৳{n(f.paid)} / ৳{n(f.due)}{f.paidOn ? ` · ${d(f.paidOn)}` : ''}</span>
                    </span>
                    <MasteryBadge band={feeBand[status]} label={t(`fee.${status}`)} />
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-xs"><Link to={`${base}/fees`} className="font-semibold text-brand-text hover:underline">{t('studentDetail.openFees')}</Link></p>
        </Section>
      </div>

      <Reveal i={10}>
        <p className="text-xs text-muted">{t('studentDetail.note')}</p>
      </Reveal>

      <ReportSheet studentId={reporting ? id : null} onClose={() => setReporting(false)} />
      <MessageSheet studentId={messaging ? id : null} batchIds={student.batchIds} onClose={() => setMessaging(false)} />
      <StudentForm open={editing} student={student} onClose={() => setEditing(false)} onDeleted={() => navigate(`${base}/batches`)} />
    </div>
  );
}
