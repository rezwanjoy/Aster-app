import { useMemo } from 'react';
import { useI18n, type TKey } from '@/i18n';
import { MasteryPill, Section } from '@/components/dashboard';
import { MasteryBadge } from '@/components/ui';
import { LockedCard } from '@/features/premium/LockedCard';
import { nameOf } from '@/lib/names';
import { teacherSummaries } from '@/lib/teachers';
import { useAppData, useToday } from '@/store/hooks';
import { situationBand } from './CenterTeachers';

/** Centers only: a short line per teacher, plus the locked "AI insights for each teacher" card. */
export function TeacherStats({ i = 0 }: { i?: number }) {
  const { t, n, lang } = useI18n();
  const data = useAppData();
  const today = useToday();
  const rows = useMemo(() => teacherSummaries(data, { today }).filter((r) => r.batchIds.length > 0), [data, today]);
  if (rows.length === 0) return null;

  return (
    <div className="space-y-4">
      <Section title={t('center.statsTitle')} i={i}>
        <p className="mb-3 text-sm text-muted">{t('center.statsHint')}</p>
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.teacher.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{nameOf(r.teacher, lang)}</p>
                <p className="text-xs text-muted">{t('center.statsLine', { batches: n(r.batchIds.length), students: n(r.students), classes: n(r.classesTaught) })}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {r.attendancePct !== null && <span className="num text-xs text-muted">{t('common.attendance')} {n(r.attendancePct)}%</span>}
                {r.avgMastery !== null && <MasteryPill pct={Math.round(r.avgMastery)} />}
                <MasteryBadge band={situationBand[r.situation]} label={t(`situation.${r.situation}` as TKey)} />
              </div>
            </li>
          ))}
        </ul>
      </Section>
      <LockedCard id="teacherAi" />
    </div>
  );
}
