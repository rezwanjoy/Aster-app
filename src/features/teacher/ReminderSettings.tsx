import { useI18n } from '@/i18n';
import { formatMonth } from '@/i18n/format';
import { Button, Card } from '@/components/ui';
import { Field, TextArea } from '@/components/forms';
import { buildReminder, unknownPlaceholders } from '@/lib/fees';
import { useAppData } from '@/store/hooks';
import { DEFAULT_SETTINGS } from '@/store/defaults';
import { useSettings } from '@/store/settings';
import type { Lang } from '@/types';

const WORDS = ['student', 'amount', 'month', 'center'] as const;

/** Edit the fee-reminder wording (English + Bangla) and the default note on parent reports. */
export function ReminderSettings() {
  const { t, n, lang: appLang } = useI18n();
  const { profile, students } = useAppData();
  const { reminderTemplate, reportStyle, banglaNumerals, patchSettings } = useSettings();
  const sample = students[0];

  const setTemplate = (l: Lang, value: string) => patchSettings({ reminderTemplate: { ...reminderTemplate, [l]: value } });
  const preview = (l: Lang) =>
    buildReminder(reminderTemplate, l, {
      student: (l === 'bn' && sample?.nameBn ? sample.nameBn : sample?.name) ?? 'Rafi',
      amount: `৳${n(1500)}`,
      month: formatMonth('2026-10', l, banglaNumerals),
      center: profile.centerName[l],
    });

  const block = (l: Lang) => {
    const bad = unknownPlaceholders(reminderTemplate[l]);
    return (
      <div key={l} className="space-y-2">
        <Field label={t(`profile.reminder.${l}`)}>
          {(id, d) => <TextArea id={id} lang={l} aria-describedby={d} aria-invalid={bad.length > 0} value={reminderTemplate[l]} onChange={(e) => setTemplate(l, e.target.value)} />}
        </Field>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('profile.reminder.insert')}>
          <span className="text-xs text-muted">{t('profile.reminder.insert')}:</span>
          {WORDS.map((w) => (
            <button key={w} type="button" onClick={() => setTemplate(l, `${reminderTemplate[l]}{${w}}`)} className="press min-h-9 cursor-pointer rounded-full border border-line-strong bg-surface-2 px-3 text-xs font-medium text-muted hover:text-fg">
              {`{${w}}`}
            </button>
          ))}
        </div>
        {bad.length > 0 && <p role="alert" className="text-xs font-medium text-red-fg">{t('profile.reminder.unknown', { names: bad.map((x) => `{${x}}`).join(', ') })}</p>}
        <div className="rounded-2xl border border-line bg-surface-2 p-3 text-sm">
          <p className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{t('profile.reminder.preview')}</p>
          <p lang={l} className="whitespace-pre-wrap">{preview(l)}</p>
        </div>
      </div>
    );
  };

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-[-0.015em]">{t('profile.reminder.title')}</h2>
        <p className="mt-1 text-sm text-muted">{t('profile.reminder.desc')}</p>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">{(appLang === 'bn' ? (['bn', 'en'] as const) : (['en', 'bn'] as const)).map(block)}</div>
      <Button variant="secondary" onClick={() => patchSettings({ reminderTemplate: DEFAULT_SETTINGS.reminderTemplate })}>{t('profile.reminder.reset')}</Button>

      <div className="border-t border-line pt-5">
        <Field label={t('profile.reportNote.title')} hint={t('profile.reportNote.hint')}>
          {(id, d) => <TextArea id={id} aria-describedby={d} value={reportStyle.teacherMessage} onChange={(e) => patchSettings({ reportStyle: { ...reportStyle, teacherMessage: e.target.value } })} />}
        </Field>
      </div>
    </Card>
  );
}
