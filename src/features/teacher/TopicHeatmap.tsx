import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useBase } from '@/app/useBase';
import { useI18n } from '@/i18n';
import { IconAlert, IconCheck, IconMinus } from '@/components/icons';
import { cx } from '@/components/ui';
import { topicHeatmap } from '@/lib/batch';
import type { Band } from '@/lib/mastery';
import { nameOf } from '@/lib/names';
import { useAppData } from '@/store/hooks';

const tone: Record<Band, string> = {
  red: 'bg-red-bg text-red-fg',
  yellow: 'bg-yellow-bg text-yellow-fg',
  green: 'bg-green-bg text-green-fg',
  unknown: 'bg-unknown-bg text-unknown-fg',
};
const icon = { red: IconAlert, yellow: IconMinus, green: IconCheck, unknown: IconMinus };

/**
 * Weak-topic map: one square per student and topic, weakest students first.
 * Each square carries an icon and the number as well as the colour.
 */
export function TopicHeatmap({ batchIds, subjectId, today }: { batchIds: string[]; subjectId: string; today: string }) {
  const { t, n, lang } = useI18n();
  const base = useBase();
  const data = useAppData();
  const map = useMemo(() => topicHeatmap(data, batchIds, subjectId, { today }), [data, batchIds, subjectId, today]);
  const topicName = (id: string) => data.topics.find((x) => x.id === id)?.name[lang] ?? id;
  const student = (id: string) => data.students.find((s) => s.id === id);

  if (map.rows.length === 0) return <p className="py-6 text-center text-sm text-muted">{t('insights.mapEmpty')}</p>;

  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-max border-separate border-spacing-0 text-xs">
        <caption className="sr-only">{t('insights.mapCaption')}</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 w-44 bg-surface px-3 py-2 text-left font-medium text-muted">{t('common.student')}</th>
            {map.topicIds.map((id) => (
              <th key={id} scope="col" className="h-28 w-11 px-0.5 align-bottom font-medium text-muted">
                <span className="mx-auto block max-h-28 overflow-hidden text-start [writing-mode:vertical-rl] [text-orientation:mixed] rotate-180">{topicName(id)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {map.rows.map((r) => {
            const s = student(r.studentId);
            return (
              <tr key={r.studentId}>
                <th scope="row" className="sticky left-0 z-10 bg-surface px-3 py-1 text-left font-medium whitespace-nowrap">
                  <Link to={`${base}/students/${r.studentId}`} className="hover:underline">{s ? nameOf(s, lang) : r.studentId}</Link>
                </th>
                {r.cells.map((c) => {
                  const Icon = icon[c.band];
                  const label = `${topicName(c.topicId)}: ${c.mastery === null ? t('mastery.unknown') : `${n(Math.round(c.mastery))}% · ${t(`mastery.${c.band}`)}`}`;
                  return (
                    <td key={c.topicId} className="p-0.5 text-center">
                      <span title={label} aria-label={label} role="img" className={cx('flex h-10 w-10 flex-col items-center justify-center rounded-lg leading-none', tone[c.band])}>
                        <Icon width={11} height={11} strokeWidth={2.6} />
                        <span className="num mt-0.5 text-[10px] font-semibold">{c.mastery === null ? '–' : n(Math.round(c.mastery))}</span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="sticky left-0 z-10 bg-surface px-3 py-2 text-left font-semibold">{t('insights.mapRedShare')}</th>
            {map.redPct.map((p, i) => (
              <td key={map.topicIds[i]} className={cx('num px-0.5 py-2 text-center text-[11px] font-semibold', p >= 40 ? 'text-red-fg' : 'text-muted')}>
                {n(p)}%
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
