import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n';
import { formatMonth } from '@/i18n/format';
import { Button, Card, Segmented } from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { Field, Select, TextArea } from '@/components/forms';
import { IconCheck } from '@/components/icons';
import { LockedCard } from '@/features/premium/LockedCard';
import { addMonths, monthOf } from '@/lib/dates';
import { buildReport, reportToText } from '@/lib/report';
import { whatsappLink } from '@/lib/whatsapp';
import { useAppData, useToday } from '@/store/hooks';
import { useSettings } from '@/store/settings';
import type { Lang } from '@/types';

type Props = {
  /** student to report on; null = closed */
  studentId: string | null;
  /** student mode: preview what a parent would see (no teacher note) */
  readOnly?: boolean;
  onClose: () => void;
};

/** Parent report: pick language and month, preview it, then copy it or share it on WhatsApp (brief D10). */
export function ReportSheet({ studentId, readOnly, onClose }: Props) {
  return studentId ? <Inner studentId={studentId} readOnly={readOnly} onClose={onClose} /> : null;
}

function Inner({ studentId, readOnly, onClose }: { studentId: string; readOnly?: boolean; onClose: () => void }) {
  const { t, lang: appLang } = useI18n();
  const data = useAppData();
  const today = useToday();
  const banglaNumerals = useSettings((s) => s.banglaNumerals);
  const defaultNote = useSettings((s) => s.reportStyle.teacherMessage);
  const student = data.students.find((s) => s.id === studentId)!;

  const [lang, setLang] = useState<Lang>(appLang);
  const [month, setMonth] = useState(monthOf(today));
  const [includeMarks, setIncludeMarks] = useState(true);
  const [includeFees, setIncludeFees] = useState(!readOnly);
  const [note, setNote] = useState(readOnly ? '' : defaultNote);
  const [copied, setCopied] = useState(false);

  const months = Array.from({ length: 6 }, (_, i) => addMonths(monthOf(today), -i));
  const text = useMemo(
    () => reportToText(data, buildReport(data, studentId, { month, today, includeMarks, includeFees, teacherNote: note }), lang, banglaNumerals),
    [data, studentId, month, today, includeMarks, includeFees, note, lang, banglaNumerals],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = Object.assign(document.createElement('textarea'), { value: text });
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const check = (label: string, on: boolean, set: (v: boolean) => void) => (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="size-5 accent-(--brand)" />
      {label}
    </label>
  );

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={readOnly ? t('report.mine') : t('report.title')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>
          <Button variant="secondary" onClick={copy}>{copied ? <><IconCheck width={16} height={16} /> {t('report.copied')}</> : t('report.copy')}</Button>
          <a
            href={whatsappLink(readOnly ? undefined : student.guardianPhone, text)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary press inline-flex min-h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
          >
            {t('report.whatsapp')}
          </a>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-4">
          {readOnly && <p className="text-sm text-muted">{t('report.mineHint')}</p>}
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('report.language')}</p>
            <Segmented<Lang> label={t('report.language')} value={lang} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'bn', label: 'বাংলা' }]} />
          </div>
          <Field label={t('report.month')}>
            {(id) => (
              <Select id={id} value={month} onChange={(e) => setMonth(e.target.value)}>
                {months.map((m) => <option key={m} value={m}>{formatMonth(m, appLang, banglaNumerals)}</option>)}
              </Select>
            )}
          </Field>
          <div>
            {check(t('report.includeMarks'), includeMarks, setIncludeMarks)}
            {check(t('report.includeFees'), includeFees, setIncludeFees)}
          </div>
          {!readOnly && (
            <Field label={t('report.teacherNote')} hint={t('report.noteHint')}>
              {(id, d) => <TextArea id={id} aria-describedby={d} value={note} onChange={(e) => setNote(e.target.value)} />}
            </Field>
          )}
          <p className="text-xs text-muted">{t('report.privacy')}</p>
          {!readOnly && <LockedCard id="pdf" />}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t('report.preview')}</p>
          <Card className="rounded-2xl p-4">
            <pre lang={lang} className="font-sans text-sm leading-relaxed whitespace-pre-wrap">{text}</pre>
          </Card>
        </div>
      </div>
    </Dialog>
  );
}
