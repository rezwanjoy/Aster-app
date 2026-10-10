import { useMemo, useState } from 'react';
import { useBase } from '@/app/useBase';
import { useI18n } from '@/i18n';
import { PageHeader } from '@/components/PageHeader';
import { LineChart } from '@/components/charts';
import { MasteryPill, PersonRow, Section, TopicBar, Trend } from '@/components/dashboard';
import { Card, Chip, IconButton } from '@/components/ui';
import { Reveal } from '@/components/motion';
import { IconBell, IconSparkle } from '@/components/icons';
import { BatchAiCard } from '@/features/ai/AiCards';
import { TeacherStats } from '@/features/center/TeacherStats';
import { InsightLines, useFindingText } from '@/features/teacher/InsightLines';
import { LogClassSheet } from '@/features/teacher/LogClassSheet';
import { MessageSheet } from '@/features/teacher/MessageSheet';
import { TopicHeatmap } from '@/features/teacher/TopicHeatmap';
import { LockedCard } from '@/features/premium/LockedCard';
import { ToggleChip } from '@/components/forms';
import { batchTopicStats, classAverageSeries, reteachTopics, studentsNeedingAttention, type AttentionReason } from '@/lib/batch';
import { teacherInsight } from '@/lib/insights';
import { nameOf } from '@/lib/names';
import { subjectIdsOf } from '@/lib/scope';
import { useAppData, useScope } from '@/store/hooks';

export function TeacherInsights() {
  const { t, n, d, lang } = useI18n();
  const base = useBase();
  const data = useAppData();
  const { batchIds, batches, today } = useScope();
  const ctx = useMemo(() => ({ today }), [today]);
  const [revision, setRevision] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; reasons: AttentionReason[]; batchIds: string[] } | null>(null);
  const subjects = useMemo(() => subjectIdsOf(data, batchIds), [data, batchIds]);
  const [subjectPick, setSubjectPick] = useState<string | null>(null);
  const subjectId = subjectPick && subjects.includes(subjectPick) ? subjectPick : subjects[0];

  const insight = useMemo(() => teacherInsight(data, batchIds, ctx), [data, batchIds, ctx]);
  const stats = useMemo(() => batchTopicStats(data, batchIds, ctx).filter((x) => x.withData > 0), [data, batchIds, ctx]);
  const reteach = useMemo(() => new Set(reteachTopics(stats).map((x) => x.topicId)), [stats]);
  const attention = useMemo(() => studentsNeedingAttention(data, batchIds, ctx), [data, batchIds, ctx]);
  const [showAll, setShowAll] = useState(false);
  const trend = useMemo(() => classAverageSeries(data, batchIds, today, subjectId), [data, batchIds, today, subjectId]);
  const sentence = useFindingText();
  const ranked = showAll ? stats : stats.filter((x) => x.redPct > 0).slice(0, 8);
  const topicName = (id: string) => data.topics.find((x) => x.id === id)?.name[lang] ?? id;
  const subjectName = (id: string) => data.subjects.find((s) => s.id === id)?.name[lang] ?? id;
  const head = insight.headline;
  const headText = head ? sentence(head) : null;
  const moving = stats.filter((x) => x.trend !== 'flat');

  // the batch to log a revision class for: one that studies the topic's subject
  const revisionBatch = (topicId: string) => {
    const subject = data.topics.find((x) => x.id === topicId)?.subjectId;
    return batches.find((b) => subject && b.subjectIds.includes(subject))?.id ?? batches[0]?.id;
  };

  if (data.batches.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow={t('teacher.insights.eyebrow')} title={t('page.teacher.insights.title')} desc={t('page.teacher.insights.desc')} />
        <Card className="text-center text-sm text-muted">{t('teacher.empty.body')}</Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('teacher.insights.eyebrow')} title={t('page.teacher.insights.title')} desc={t('page.teacher.insights.desc')} />

      <Reveal i={1}>
        <Card hero className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-7">
          <div className="flex min-w-0 flex-1 basis-72 items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-[#f6e7c1]">
              <IconSparkle width={26} height={26} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.14em] text-[#f1e2bd] uppercase">{t('teacher.insights.basic')}</p>
              <p className="font-display mt-1.5 text-xl leading-snug font-semibold tracking-[-0.02em] sm:text-2xl">
                {headText ? headText.text : t('teacher.insights.allGood')}
              </p>
              <p className="mt-2 text-sm text-white/80">{head?.type === 'reteach' ? t('teacher.insights.sub') : t('teacher.insights.subGeneral')}</p>
            </div>
          </div>
          {head?.type === 'reteach' && revisionBatch(head.topicId) && (
            <button type="button" onClick={() => setRevision(head.topicId)} className="press min-h-11 cursor-pointer rounded-2xl bg-white px-4 text-sm font-semibold text-[#2d1580] hover:bg-white/90">
              {t('teacher.insights.planRevision')}
            </button>
          )}
        </Card>
      </Reveal>

      <Reveal i={2}><BatchAiCard batchIds={batchIds} today={today} /></Reveal>

      {insight.findings.some((f, i) => i > 0 && f.type !== 'attention') && (
        <Section title={t('teacher.insights.more')} i={2}>
          <InsightLines batchIds={batchIds} today={today} skip={head?.type === 'attention' ? 0 : 1} limit={6} exclude={['attention']} />
        </Section>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-6">
        <Section title={t('teacher.insights.ranking')} className="lg:col-span-3" i={3}>
          {stats.length === 0 ? (
            <p className="text-sm text-muted">{t('teacher.today.noMarks')}</p>
          ) : (
            <ul className="space-y-3.5">
              {ranked.map((tp, i) => (
                <TopicBar
                  key={tp.topicId}
                  i={i}
                  name={topicName(tp.topicId)}
                  badge={
                    <span className="flex flex-wrap items-center gap-1.5">
                      {tp.trend !== 'flat' && <Trend trend={tp.trend} />}
                      {reteach.has(tp.topicId) && <Chip tone="gold">{t('teacher.insights.reteachChip')}</Chip>}
                    </span>
                  }
                  value={tp.redPct}
                  valueLabel={`${n(tp.redPct)}%`}
                  tone={tp.redPct >= 40 ? 'red' : tp.redPct >= 20 ? 'yellow' : 'green'}
                />
              ))}
            </ul>
          )}
          {stats.length > ranked.length || showAll ? (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 min-h-11 cursor-pointer text-sm font-semibold text-brand-text hover:underline">
              {showAll ? t('teacher.insights.showFewer') : t('teacher.insights.showAll', { n: n(stats.length) })}
            </button>
          ) : null}
          <p className="mt-2 text-xs text-muted">{t('teacher.insights.rankNote')}</p>
        </Section>

        <div className="space-y-4 lg:col-span-2 lg:space-y-6">
          <Section title={t('teacher.insights.attention')} i={4}>
            {attention.length === 0 ? (
              <p className="text-sm text-muted">{t('teacher.today.allGood')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {attention.map((a) => {
                  const s = data.students.find((x) => x.id === a.studentId)!;
                  return (
                    <PersonRow
                      key={a.studentId}
                      name={nameOf(s, lang)}
                      to={`${base}/students/${s.id}`}
                      meta={
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span>{a.reasons.map((r) => t(`reason.${r}`)).join(' · ')}</span>
                          {a.feeLate && <Chip tone="gold">{t('reason.feeLate')}</Chip>}
                        </span>
                      }
                      right={
                        <span className="flex items-center gap-1">
                          {a.mastery !== null && <MasteryPill pct={Math.round(a.mastery)} />}
                          <IconButton label={t('message.to', { student: nameOf(s, lang) })} className="border border-line-strong" onClick={() => setMessage({ id: s.id, reasons: a.reasons, batchIds: a.batchIds })}>
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

          <Section title={t('teacher.insights.trend')} i={5} action={subjectId ? <Chip tone="muted">{subjectName(subjectId)}</Chip> : undefined}>
            {trend.length < 2 ? (
              <p className="text-sm text-muted">{t('teacher.insights.trendNeed')}</p>
            ) : (
              <>
                <LineChart
                  data={trend.map((p, i) => ({ label: `${t('common.testShort')}${n(i + 1)}`, value: Math.round(p.pct) }))}
                  min={Math.max(0, Math.floor((Math.min(...trend.map((p) => p.pct)) - 10) / 10) * 10)}
                  max={Math.min(100, Math.ceil((Math.max(...trend.map((p) => p.pct)) + 10) / 10) * 10)}
                  ariaLabel={t('teacher.insights.trend')}
                />
                <p className="mt-2 text-xs text-muted">{t('teacher.insights.trendNote', { first: trend[0].name, last: trend[trend.length - 1].name, date: d(trend[trend.length - 1].date) })}</p>
              </>
            )}
          </Section>
        </div>
      </div>

      {moving.length > 0 && (
        <Section title={t('teacher.insights.changes')} i={6}>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {moving.map((tp) => (
              <li key={tp.topicId} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 px-3.5 py-3">
                <span className="min-w-0 truncate text-sm font-medium">{topicName(tp.topicId)}</span>
                <Trend trend={tp.trend} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {subjectId && (
        <Section
          title={t('insights.mapTitle')}
          i={7}
          action={
            subjects.length > 1 ? (
              <div role="group" aria-label={t('insights.mapSubject')} className="flex flex-wrap gap-2">
                {subjects.map((id) => (
                  <ToggleChip key={id} on={id === subjectId} onClick={() => setSubjectPick(id)}>{subjectName(id)}</ToggleChip>
                ))}
              </div>
            ) : (
              <Chip tone="muted">{subjectName(subjectId)}</Chip>
            )
          }
        >
          <p className="mb-1 text-sm text-muted">{t('insights.mapHint')}</p>
          <p className="mb-3 text-xs font-medium text-brand-text sm:hidden">{t('insights.mapSwipe')}</p>
          <TopicHeatmap batchIds={batchIds} subjectId={subjectId} today={today} />
        </Section>
      )}

      {base === '/center' && <TeacherStats i={8} />}

      <Reveal i={9}><LockedCard id="alerts" /></Reveal>

      <LogClassSheet
        open={revision !== null}
        batchId={revision ? revisionBatch(revision) : undefined}
        topicIds={revision ? [revision] : undefined}
        today={today}
        onClose={() => setRevision(null)}
      />
      <MessageSheet studentId={message?.id ?? null} reasons={message?.reasons} batchIds={message?.batchIds} onClose={() => setMessage(null)} />
    </div>
  );
}
