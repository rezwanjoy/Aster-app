import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n';
import { formatMonth } from '@/i18n/format';
import { Reveal } from '@/components/motion';
import { Button, Card, Chip } from '@/components/ui';
import { Select } from '@/components/forms';
import { TeacherForm } from '@/features/teacher/TeacherForm';
import { addMonths, monthOf } from '@/lib/dates';
import { nameOf } from '@/lib/names';
import { markSalaryPaid, salaryRows, salaryTotals, setTrackSalaries, unmarkSalaryPaid } from '@/lib/salary';
import { useData } from '@/store/data';
import { useAppData, useToday } from '@/store/hooks';
import { useSettings } from '@/store/settings';
import type { Teacher } from '@/types';

/** Centers only, and optional: a simple on/off switch, then one line per teacher with a "Mark paid" button. */
export function SalaryPanel() {
  const { t, n, d, lang } = useI18n();
  const data = useAppData();
  const today = useToday();
  const banglaNumerals = useSettings((s) => s.banglaNumerals);
  const on = !!data.profile.trackSalaries;
  const current = monthOf(today);
  const months = useMemo(() => {
    const paid = data.salaries.map((p) => p.month);
    return [...new Set([addMonths(current, 1), current, addMonths(current, -1), addMonths(current, -2), ...paid])].sort().reverse();
  }, [data.salaries, current]);
  const [month, setMonth] = useState(current);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const rows = useMemo(() => salaryRows(data, month), [data, month]);
  const sum = salaryTotals(rows);
  const apply = useData.getState().apply;

  return (
    <Reveal i={2}>
      <Card className="space-y-4">
        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input type="checkbox" checked={on} onChange={(e) => apply((x) => setTrackSalaries(x, e.target.checked))} className="mt-1 size-5 shrink-0 accent-(--brand)" />
          <span>
            <span className="font-display block text-lg font-semibold tracking-[-0.015em]">{t('salary.title')}</span>
            <span className="block text-sm text-muted">{t('salary.hint')}</span>
          </span>
        </label>

        {on && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="block">
                <span className="sr-only">{t('fees.month')}</span>
                <Select value={month} onChange={(e) => setMonth(e.target.value)} className="min-w-44 font-semibold">
                  {months.map((m) => <option key={m} value={m}>{formatMonth(m, lang, banglaNumerals)}</option>)}
                </Select>
              </label>
              <p className="text-sm text-muted">
                {t('salary.summary', { paid: `৳${n(sum.paid)}`, total: `৳${n(sum.due)}` })}
                {sum.owed > 0 && ` · ${t('salary.left', { amount: `৳${n(sum.owed)}` })}`}
              </p>
            </div>
            <ul className="divide-y divide-line">
              {rows.map((r) => (
                <li key={r.teacher.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{nameOf(r.teacher, lang)}</p>
                    <p className="text-xs text-muted">
                      {r.status === 'unset' ? t('salary.notSet') : `৳${n(r.due)}${t('batches.perMonth')}`}
                      {r.status === 'paid' && r.paidOn ? ` · ${t('salary.paidOn', { date: d(r.paidOn) })}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.status === 'paid' && <Chip tone="brand">{t('salary.paid')}</Chip>}
                    {r.status === 'due' && <Chip tone="gold">{t('salary.due')}</Chip>}
                    {r.status === 'unset' ? (
                      <Button variant="secondary" onClick={() => setEditing(r.teacher)}>{t('salary.set')}</Button>
                    ) : r.status === 'paid' ? (
                      <Button variant="ghost" onClick={() => apply((x) => unmarkSalaryPaid(x, r.teacher.id, month))}>{t('salary.undo')}</Button>
                    ) : (
                      <Button onClick={() => apply((x) => markSalaryPaid(x, r.teacher.id, month, today))}>{t('salary.markPaid')}</Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">{t('salary.setHint')}</p>
          </div>
        )}
      </Card>
      <TeacherForm open={editing !== null} teacher={editing} onClose={() => setEditing(null)} />
    </Reveal>
  );
}
