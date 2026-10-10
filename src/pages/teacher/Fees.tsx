import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n';
import { formatMonth } from '@/i18n/format';
import { PageHeader } from '@/components/PageHeader';
import { Ring } from '@/components/charts';
import { CountUp, Reveal } from '@/components/motion';
import { PersonRow, Section } from '@/components/dashboard';
import { Button, Card, MasteryBadge, type MasteryBand } from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { Field, Select, TextInput } from '@/components/forms';
import { IconBell, IconWallet } from '@/components/icons';
import { IconButton } from '@/components/ui';
import { SalaryPanel } from '@/features/center/SalaryPanel';
import { useBase } from '@/app/useBase';
import { addMonths, isValidISODate, monthOf } from '@/lib/dates';
import { buildReminder, feeMonths, feesFor, feeStatus, remaining, totals, type FeeStatus } from '@/lib/fees';
import { ensureMonthFees } from '@/lib/ops';
import { whatsappLink } from '@/lib/whatsapp';
import { useData } from '@/store/data';
import { useSettings } from '@/store/settings';
import { useAppData, useScope } from '@/store/hooks';
import type { FeeRecord } from '@/types';

const band: Record<FeeStatus, MasteryBand> = { paid: 'green', partial: 'yellow', due: 'unknown', overdue: 'red' };

export function TeacherFees() {
  const { t, n, d, lang } = useI18n();
  const base = useBase();
  const data = useAppData();
  const { batchIds, batches, today } = useScope();
  const banglaNumerals = useSettings((s) => s.banglaNumerals);
  const template = useSettings((s) => s.reminderTemplate);
  const current = monthOf(today);
  const months = useMemo(() => [...new Set([addMonths(current, 1), current, ...feeMonths(data)])].sort().reverse(), [data, current]);
  const [month, setMonth] = useState(current);
  const [paying, setPaying] = useState<FeeRecord | null>(null);

  const records = useMemo(() => feesFor(data, { batchIds, month }), [data, batchIds, month]);
  const sum = totals(records);
  const missing = useMemo(() => ensureMonthFees(data, batchIds, month).fees.length - data.fees.length, [data, batchIds, month]);
  const monthName = (m: string, style: 'long' | 'short' = 'long') => formatMonth(m, lang, banglaNumerals, style);
  const nm = (id: string) => {
    const s = data.students.find((x) => x.id === id);
    return s ? (lang === 'bn' && s.nameBn ? s.nameBn : s.name) : id;
  };
  const remind = (f: FeeRecord) => {
    const s = data.students.find((x) => x.id === f.studentId);
    const text = buildReminder(template, lang, { student: nm(f.studentId), amount: `৳${n(remaining(f))}`, month: monthName(f.month), center: data.profile.centerName[lang] });
    return whatsappLink(s?.guardianPhone, text);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('teacher.fees.eyebrow')}
        title={t('page.teacher.fees.title')}
        desc={t('page.teacher.fees.desc')}
        aside={
          <label className="block">
            <span className="sr-only">{t('fees.month')}</span>
            <Select value={month} onChange={(e) => setMonth(e.target.value)} className="min-w-44 font-semibold">
              {months.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
            </Select>
          </label>
        }
      />

      {base === '/center' && <SalaryPanel />}

      <Reveal i={1}>
        <Card hero className="flex flex-wrap items-center justify-between gap-6 p-5 sm:p-7">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-[#f1e2bd] uppercase">{t('teacher.fees.collected')} · {monthName(month)}</p>
            <p className="font-display mt-2 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl"><CountUp value={sum.collected} prefix="৳" /></p>
            <p className="mt-2 text-white/80">{t('teacher.fees.of', { total: `৳${n(sum.due)}` })} · {t('teacher.fees.owed', { amount: `৳${n(sum.owed)}` })}</p>
          </div>
          <Ring value={sum.pct} size={120} stroke={11} label={`${n(sum.pct)}%`} sub={t('teacher.fees.collectedShort')} />
        </Card>
      </Reveal>

      {missing > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">{t('fees.missing', { n: n(missing), month: monthName(month) })}</p>
          <Button onClick={() => useData.getState().apply((x) => ensureMonthFees(x, batchIds, month))}>{t('fees.create', { month: monthName(month, 'short') })}</Button>
        </Card>
      )}

      {batches.map((b, i) => {
        const rows = records.filter((f) => f.batchId === b.id);
        if (rows.length === 0) return null;
        const bs = totals(rows);
        return (
          <Section key={b.id} i={i + 2} title={lang === 'bn' && b.nameBn ? b.nameBn : b.name} action={<span className="num text-sm text-muted">৳{n(bs.collected)} / ৳{n(bs.due)}</span>}>
            <ul className="divide-y divide-line">
              {rows.map((f) => {
                const status = feeStatus(f, today);
                return (
                  <PersonRow
                    key={f.id}
                    name={nm(f.studentId)}
                    meta={`৳${n(f.paid)} / ৳${n(f.due)}${f.paidOn ? ` · ${d(f.paidOn)}` : ''}`}
                    right={
                      <span className="flex items-center gap-1">
                        <MasteryBadge band={band[status]} label={t(`fee.${status}`)} />
                        {status !== 'paid' && (
                          <a href={remind(f)} target="_blank" rel="noopener noreferrer" aria-label={t('fees.remind', { student: nm(f.studentId) })} title={t('fees.remind', { student: nm(f.studentId) })} className="press inline-flex size-11 items-center justify-center rounded-2xl border border-line-strong hover:bg-surface-2">
                            <IconBell width={20} height={20} />
                          </a>
                        )}
                        <IconButton label={t('fees.record', { student: nm(f.studentId) })} className="border border-line-strong" onClick={() => setPaying(f)}><IconWallet width={20} height={20} /></IconButton>
                      </span>
                    }
                  />
                );
              })}
            </ul>
          </Section>
        );
      })}

      {records.length === 0 && missing === 0 && <Card className="text-center text-sm text-muted">{t('fees.none')}</Card>}
      {paying && <PaymentSheet fee={paying} today={today} name={nm(paying.studentId)} onClose={() => setPaying(null)} />}
    </div>
  );
}

function PaymentSheet({ fee, today, name, onClose }: { fee: FeeRecord; today: string; name: string; onClose: () => void }) {
  const { t, n } = useI18n();
  const [paid, setPaid] = useState(String(fee.paid));
  const [on, setOn] = useState(fee.paidOn ?? today);
  const [touched, setTouched] = useState(false);
  const value = Number(paid);
  const errors = {
    paid: paid.trim() === '' || !Number.isFinite(value) || value < 0 || value > fee.due ? t('fees.badAmount', { max: n(fee.due) }) : undefined,
    on: value > 0 && !isValidISODate(on) ? t('forms.badDate') : undefined,
  };
  const save = () => {
    setTouched(true);
    if (errors.paid || errors.on) return;
    useData.getState().patch('fees', fee.id, { paid: value, paidOn: value > 0 ? on : undefined });
    onClose();
  };
  return (
    <Dialog open onClose={onClose} title={t('fees.recordTitle', { student: name })} footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={save}>{t('common.save')}</Button></>}>
      <div className="space-y-4">
        <p className="text-sm text-muted">{t('fees.due', { amount: `৳${n(fee.due)}` })}</p>
        <Field label={t('fees.totalPaid')} error={touched ? errors.paid : undefined}>
          {(id, dd) => <TextInput id={id} inputMode="numeric" aria-describedby={dd} aria-invalid={touched && !!errors.paid} value={paid} onChange={(e) => setPaid(e.target.value)} />}
        </Field>
        <Button variant="secondary" onClick={() => setPaid(String(fee.due))}>{t('fees.markPaid')}</Button>
        <Field label={t('fees.paidOn')} error={touched ? errors.on : undefined}>
          {(id, dd) => <TextInput id={id} type="date" aria-describedby={dd} value={on} onChange={(e) => setOn(e.target.value)} />}
        </Field>
      </div>
    </Dialog>
  );
}
