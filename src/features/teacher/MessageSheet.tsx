import { useState } from 'react';
import { useI18n, type TKey } from '@/i18n';
import { Button } from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { Field, Select, TextArea } from '@/components/forms';
import { whatsappLink } from '@/lib/whatsapp';
import { nameOf } from '@/lib/names';
import { useData } from '@/store/data';
import { useAppData } from '@/store/hooks';
import type { AttentionReason } from '@/lib/batch';

type Props = {
  /** open for this student; null = closed */
  studentId: string | null;
  /** batches to choose from (defaults to all the student's batches) */
  batchIds?: string[];
  reasons?: AttentionReason[];
  onClose: () => void;
};

/**
 * Message a student from "needs attention". There is no server, so the message is saved on this
 * device (the student sees it in their Inbox in Student mode); WhatsApp reaches the guardian.
 */
export function MessageSheet(props: Props) {
  const { studentId, onClose } = props;
  return studentId ? <Inner key={studentId} {...props} studentId={studentId} onClose={onClose} /> : null;
}

function Inner({ studentId, batchIds, reasons = [], onClose }: Props & { studentId: string }) {
  const { t, lang, d } = useI18n();
  const data = useAppData();
  const student = data.students.find((s) => s.id === studentId)!;
  const options = data.batches.filter((b) => student.batchIds.includes(b.id) && (!batchIds || batchIds.includes(b.id)));
  const [batchId, setBatchId] = useState(options[0]?.id ?? student.batchIds[0]);
  const batch = data.batches.find((b) => b.id === batchId);
  const first = (lang === 'bn' && student.nameBn ? student.nameBn : student.name).split(' ')[0];
  const batchName = (lang === 'bn' && batch?.nameBn) || batch?.name || '';

  const suggestions: { key: string; text: string }[] = [
    { key: 'general', text: t('message.tpl.general', { student: first, batch: batchName }) },
    ...(reasons.includes('lowAttendance') ? [{ key: 'att', text: t('message.tpl.attendance', { student: first, batch: batchName }) }] : []),
    ...(reasons.includes('trendDown') || reasons.includes('manyRed') ? [{ key: 'marks', text: t('message.tpl.marks', { student: first, batch: batchName }) }] : []),
  ];
  const [body, setBody] = useState(suggestions[suggestions.length - 1].text);
  const [sent, setSent] = useState(false);
  const previous = data.messages.filter((m) => m.studentId === studentId).sort((a, b) => b.sentAt.localeCompare(a.sentAt)).slice(0, 3);
  const empty = !body.trim();

  const send = () => {
    if (empty || !batchId) return;
    useData.getState().sendMessage(studentId, batchId, body);
    setSent(true);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('message.title', { student: lang === 'bn' && student.nameBn ? student.nameBn : student.name })}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>
          <a
            href={empty ? undefined : whatsappLink(student.guardianPhone, body)}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={empty}
            className="press inline-flex min-h-11 items-center justify-center rounded-2xl border border-line-strong bg-glass px-5 text-sm font-semibold hover:bg-surface-2 aria-disabled:opacity-50"
          >
            {t('message.whatsapp')}
          </a>
          <Button onClick={send} disabled={empty || sent}>{sent ? t('message.sentShort') : t('message.send')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {options.length > 1 && (
          <Field label={t('message.batch')}>
            {(id) => (
              <Select id={id} value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                {options.map((b) => (
                  <option key={b.id} value={b.id}>{nameOf(b, lang)}</option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('message.suggestions')}>
          {suggestions.map((s) => (
            <button key={s.key} type="button" onClick={() => { setBody(s.text); setSent(false); }} className="press min-h-9 cursor-pointer rounded-full border border-line-strong bg-surface-2 px-3 text-xs font-medium text-muted hover:text-fg">
              {t(`message.chip.${s.key}` as TKey)}
            </button>
          ))}
        </div>
        <Field label={t('message.body')}>
          {(id) => <TextArea id={id} value={body} onChange={(e) => { setBody(e.target.value); setSent(false); }} />}
        </Field>
        <p role="status" aria-live="polite" className={sent ? 'text-sm font-medium text-green-fg' : 'sr-only'}>
          {sent ? t('message.sent', { student: first }) : ''}
        </p>
        <p className="text-xs text-muted">{t('message.note')}</p>
        {previous.length > 0 && (
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{t('message.previous')}</h3>
            <ul className="space-y-1.5">
              {previous.map((m) => (
                <li key={m.id} className="rounded-2xl border border-line bg-surface-2 p-2.5 text-xs">
                  <span className="text-muted">{d(m.sentAt.slice(0, 10))} · {data.batches.find((b) => b.id === m.batchId)?.name}</span>
                  <p className="mt-0.5">{m.body}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Dialog>
  );
}
