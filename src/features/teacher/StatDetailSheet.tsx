import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBase } from '@/app/useBase';
import { useI18n } from '@/i18n';
import { Button, Segmented } from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { ProgressBar } from '@/components/charts';
import { MasteryPill, PersonRow, TopicBar } from '@/components/dashboard';
import { attendanceRate, rangeStart } from '@/lib/attendance';
import { batchTopicStats, scopeSummary } from '@/lib/batch';
import { bandOf } from '@/lib/mastery';
import { studentsInBatches } from '@/lib/scope';
import { useAppData, useScope } from '@/store/hooks';

export type StatTab = 'students' | 'attendance' | 'mastery';

/**
 * Detail panel behind the Students / Attendance / Mastery tiles. Every number is calculated
 * from your data (AI wording comes later and never changes the numbers).
 */
export function StatDetailSheet({ open, initial, onClose }: { open: boolean; initial: StatTab; onClose: () => void }) {
  return open ? <Inner key={initial} initial={initial} onClose={onClose} /> : null;
}

function Inner({ initial, onClose }: { initial: StatTab; onClose: () => void }) {
  const { t, n, lang } = useI18n();
  const base = useBase();
  const data = useAppData();
  const { batchIds, batches, today } = useScope();
  const [tab, setTab] = useState<StatTab>(initial);
  const ctx = { today };

  const perBatch = useMemo(() => batches.map((b) => ({ batch: b, s: scopeSummary(data, [b.id], ctx) })), [data, batches, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const lowest = useMemo(
    () =>
      studentsInBatches(data, batchIds)
        .map((s) => ({ s, r: attendanceRate(data, { batchIds: s.batchIds.filter((b) => batchIds.includes(b)), studentId: s.id, from: rangeStart('4w', today), to: today }) }))
        .filter((x) => x.r.pct !== null)
        .sort((a, b) => (a.r.pct as number) - (b.r.pct as number))
        .slice(0, 4),
    [data, batchIds, today],
  );
  const topics = useMemo(() => batchTopicStats(data, batchIds, ctx).filter((x) => x.withData > 0), [data, batchIds, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const topicName = (id: string) => data.topics.find((x) => x.id === id)?.name[lang] ?? id;
  const weakest = [...topics].sort((a, b) => (a.avgMastery as number) - (b.avgMastery as number)).slice(0, 3);
  const strongest = [...topics].sort((a, b) => (b.avgMastery as number) - (a.avgMastery as number)).slice(0, 3);
  const name = (b: (typeof batches)[number]) => (lang === 'bn' && b.nameBn) || b.name;

  return (
    <Dialog open onClose={onClose} title={t('stats.title')} size="md" footer={<Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>}>
      <div className="space-y-4">
        <Segmented
          label={t('stats.title')}
          value={tab}
          onChange={setTab}
          className="w-full"
          options={[
            { value: 'students', label: t('common.students') },
            { value: 'attendance', label: t('common.attendance') },
            { value: 'mastery', label: t('common.mastery') },
          ]}
        />

        {tab === 'students' && (
          <ul className="space-y-2">
            {perBatch.map(({ batch, s }) => (
              <li key={batch.id}>
                <Link to={`${base}/batches/${batch.id}`} onClick={onClose} className="press flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 px-3.5 hover:border-line-strong">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{name(batch)}</span>
                    <span className="block text-xs text-muted">{t('stats.attendanceShort', { pct: s.attendancePct === null ? '–' : `${n(s.attendancePct)}%` })}</span>
                  </span>
                  <span className="num font-display text-2xl font-semibold">{n(s.students)}</span>
                </Link>
              </li>
            ))}
            {perBatch.length === 0 && <p className="text-sm text-muted">{t('stats.none')}</p>}
          </ul>
        )}

        {tab === 'attendance' && (
          <div className="space-y-4">
            <ul className="space-y-3">
              {perBatch.map(({ batch, s }) => (
                <li key={batch.id} className="space-y-1.5">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate">{name(batch)}</span>
                    <span className="num font-semibold">{s.attendancePct === null ? '–' : `${n(s.attendancePct)}%`}</span>
                  </div>
                  <ProgressBar value={s.attendancePct ?? 0} goal={75} />
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">{t('stats.attendanceNote')}</p>
            {lowest.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{t('stats.lowestAttendance')}</h3>
                <ul className="divide-y divide-line">
                  {lowest.map(({ s, r }) => (
                    <PersonRow key={s.id} name={lang === 'bn' && s.nameBn ? s.nameBn : s.name} meta={t('stats.classesCount', { a: n(r.attended), t: n(r.total) })} right={<span className="num text-sm font-semibold">{n(r.pct as number)}%</span>} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === 'mastery' && (
          <div className="space-y-4">
            <ul className="space-y-2">
              {perBatch.map(({ batch, s }) => (
                <li key={batch.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 px-3.5 py-3">
                  <span className="min-w-0 truncate text-sm font-semibold">{name(batch)}</span>
                  {s.avgMastery === null ? <span className="text-xs text-muted">{t('mastery.unknown')}</span> : <MasteryPill pct={Math.round(s.avgMastery)} />}
                </li>
              ))}
            </ul>
            {weakest.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{t('stats.weakest')}</h3>
                <ul className="space-y-3">
                  {weakest.map((x, i) => (
                    <TopicBar key={x.topicId} i={i} name={topicName(x.topicId)} value={x.avgMastery as number} valueLabel={`${n(Math.round(x.avgMastery as number))}%`} tone={bandOf(x.avgMastery)} />
                  ))}
                </ul>
              </div>
            )}
            {strongest.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{t('stats.strongest')}</h3>
                <ul className="space-y-3">
                  {strongest.map((x, i) => (
                    <TopicBar key={x.topicId} i={i} name={topicName(x.topicId)} value={x.avgMastery as number} valueLabel={`${n(Math.round(x.avgMastery as number))}%`} tone={bandOf(x.avgMastery)} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
