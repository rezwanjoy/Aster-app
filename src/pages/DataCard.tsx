import { useRef, useState } from 'react';
import { useI18n } from '@/i18n';
import { Button, Card } from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { parseBackup } from '@/lib/backup';
import { todayISO } from '@/lib/dates';
import { exportBackupText, importBackupText, resetDemoData } from '@/store/actions';
import { useData } from '@/store/data';

type Notice = { tone: 'ok' | 'error'; text: string } | null;

/** Backup, restore and reset (brief D14). All data lives on this device. */
export function DataCard() {
  const { t, n } = useI18n();
  const batches = useData((s) => s.batches.length);
  const students = useData((s) => s.students.length);
  const exams = useData((s) => s.assessments.length);
  const classes = useData((s) => s.sessions.length);
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pending, setPending] = useState<{ text: string; batches: number; students: number } | null>(null);

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportBackupText()], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `aster-backup-${todayISO()}.json` });
    a.click();
    URL.revokeObjectURL(url);
    setNotice({ tone: 'ok', text: t('settings.data.exported') });
  };

  const chooseFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const parsed = parseBackup(text);
    if (!parsed.ok) setNotice({ tone: 'error', text: `${t('settings.data.importFailed')}: ${parsed.error}` });
    else setPending({ text, batches: parsed.data.batches.length, students: parsed.data.students.length });
    if (fileRef.current) fileRef.current.value = ''; // allow choosing the same file again
  };

  const stats: [string, number][] = [
    [t('settings.data.batches'), batches],
    [t('settings.data.students'), students],
    [t('settings.data.exams'), exams],
    [t('settings.data.classes'), classes],
  ];

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-[-0.015em]">{t('settings.data.title')}</h2>
        <p className="mt-1 text-sm text-muted">{t('settings.data.desc')}</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-surface-2 p-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="num font-display text-xl font-semibold" data-testid={`count-${label}`}>{n(value)}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button onClick={download}>{t('settings.data.export')}</Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>{t('settings.data.import')}</Button>
        <Button variant="secondary" onClick={() => setConfirmReset(true)}>{t('settings.data.reset')}</Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => chooseFile(e.target.files?.[0])} />
      </div>

      <p className="text-xs text-muted">{t('settings.data.keyNote')}</p>
      <p role="status" aria-live="polite" className={notice ? (notice.tone === 'ok' ? 'text-sm font-medium text-green-fg' : 'text-sm font-medium text-red-fg') : 'sr-only'}>
        {notice?.text}
      </p>

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title={t('settings.data.resetTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => {
                resetDemoData();
                setConfirmReset(false);
                setNotice({ tone: 'ok', text: t('settings.data.resetDone') });
              }}
            >
              {t('settings.data.reset')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{t('settings.data.resetBody')}</p>
      </Dialog>

      <Dialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title={t('settings.data.importTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => {
                const error = pending ? importBackupText(pending.text) : null;
                setNotice(error ? { tone: 'error', text: `${t('settings.data.importFailed')}: ${error}` } : { tone: 'ok', text: t('settings.data.imported') });
                setPending(null);
              }}
            >
              {t('common.confirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{pending && t('settings.data.importBody', { batches: n(pending.batches), students: n(pending.students) })}</p>
      </Dialog>
    </Card>
  );
}
