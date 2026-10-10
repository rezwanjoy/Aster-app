import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Field, FormGrid, Select, TextInput, ToggleChip } from '@/components/forms';
import { isValidISODate } from '@/lib/dates';
import { newId } from '@/lib/ops';
import { useData } from '@/store/data';
import { useAppData } from '@/store/hooks';
import type { Assessment } from '@/types';

type Props = {
  open: boolean;
  /** null = create a new exam */
  exam: Assessment | null;
  defaultBatchId?: string;
  today: string;
  onClose: () => void;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
};

/** Create or edit an exam: name, date, batch, subject, the topics it covers and each topic's maximum marks. */
export function ExamForm(props: Props) {
  return props.open ? <Inner {...props} /> : null;
}

function Inner({ exam, defaultBatchId, today, onClose, onSaved, onDeleted }: Props) {
  const { t, lang, n } = useI18n();
  const data = useAppData();
  const [batchId, setBatchId] = useState(exam?.batchId ?? defaultBatchId ?? data.batches[0]?.id ?? '');
  const batch = data.batches.find((b) => b.id === batchId);
  const [subjectId, setSubjectId] = useState(exam?.subjectId ?? batch?.subjectIds[0] ?? '');
  const [name, setName] = useState(exam?.name ?? '');
  const [nameBn, setNameBn] = useState(exam?.nameBn ?? '');
  const [date, setDate] = useState(exam?.date ?? today);
  const [maxes, setMaxes] = useState<Record<string, string>>(Object.fromEntries((exam?.parts ?? []).map((p) => [p.topicId, String(p.maxMarks)])));
  const [touched, setTouched] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const topics = useMemo(() => data.topics.filter((x) => x.subjectId === subjectId).sort((a, b) => a.order - b.order), [data.topics, subjectId]);
  const chosen = topics.filter((x) => x.id in maxes);
  const scored = exam ? Object.keys(exam.scores).length : 0;

  const errors = {
    name: !name.trim() ? t('forms.required') : undefined,
    date: !isValidISODate(date) ? t('forms.badDate') : undefined,
    topics: chosen.length === 0 ? t('examForm.pickTopic') : undefined,
    max: chosen.some((x) => !(Number(maxes[x.id]) > 0)) ? t('examForm.badMax') : undefined,
  };

  const changeBatch = (id: string) => {
    setBatchId(id);
    setSubjectId(data.batches.find((b) => b.id === id)?.subjectIds[0] ?? '');
    setMaxes({});
  };
  const changeSubject = (id: string) => {
    setSubjectId(id);
    setMaxes({});
  };
  const toggle = (id: string) =>
    setMaxes((cur) => {
      const { [id]: had, ...rest } = cur;
      return had === undefined ? { ...cur, [id]: '10' } : rest;
    });

  const save = () => {
    setTouched(true);
    if (errors.name || errors.date || errors.topics || errors.max) return;
    const parts = chosen.map((x) => ({ topicId: x.id, maxMarks: Number(maxes[x.id]) }));
    // keep marks only for topics still in the exam, and never above the new maximum
    const scores: Assessment['scores'] = {};
    for (const [sid, row] of Object.entries(exam?.scores ?? {})) {
      scores[sid] = Object.fromEntries(parts.flatMap((p) => (p.topicId in row ? [[p.topicId, row[p.topicId] !== null && (row[p.topicId] as number) > p.maxMarks ? null : row[p.topicId]]] : [])));
    }
    const id = exam?.id ?? newId('a');
    useData.getState().upsert('assessments', { id, batchId, subjectId, name: name.trim(), nameBn: nameBn.trim() || undefined, date, parts, scores });
    onSaved?.(id);
    onClose();
  };

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        size="md"
        title={exam ? t('examForm.editTitle') : t('examForm.addTitle')}
        footer={
          <>
            {exam && <Button variant="secondary" className="mr-auto text-red-fg" onClick={() => setDeleting(true)}>{t('common.delete')}</Button>}
            <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
            <Button onClick={save}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormGrid>
            <Field label={t('examForm.name')} error={touched ? errors.name : undefined}>
              {(id, d) => <TextInput id={id} aria-describedby={d} aria-invalid={touched && !!errors.name} value={name} onChange={(e) => setName(e.target.value)} placeholder="Class Test 6" />}
            </Field>
            <Field label={t('examForm.nameBn')}>{(id) => <TextInput id={id} value={nameBn} onChange={(e) => setNameBn(e.target.value)} />}</Field>
            <Field label={t('examForm.batch')} hint={exam ? t('examForm.batchLocked') : undefined}>
              {(id, d) => (
                <Select id={id} aria-describedby={d} value={batchId} disabled={!!exam} onChange={(e) => changeBatch(e.target.value)}>
                  {data.batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              )}
            </Field>
            <Field label={t('examForm.subject')}>
              {(id) => (
                <Select id={id} value={subjectId} disabled={!!exam} onChange={(e) => changeSubject(e.target.value)}>
                  {data.subjects.filter((s) => batch?.subjectIds.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.name[lang]}</option>)}
                </Select>
              )}
            </Field>
            <Field label={t('examForm.date')} hint={date > today ? t('examForm.upcomingHint') : undefined} error={touched ? errors.date : undefined}>
              {(id, d) => <TextInput id={id} type="date" aria-describedby={d} aria-invalid={touched && !!errors.date} value={date} onChange={(e) => setDate(e.target.value)} />}
            </Field>
          </FormGrid>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t('examForm.topics')}</legend>
            <div className="flex flex-wrap gap-2">
              {topics.map((x) => <ToggleChip key={x.id} on={x.id in maxes} onClick={() => toggle(x.id)}>{x.name[lang]}</ToggleChip>)}
            </div>
            {touched && errors.topics && <p className="text-xs font-medium text-red-fg">{errors.topics}</p>}
          </fieldset>

          {chosen.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t('examForm.maxMarks')}</legend>
              <ul className="space-y-2">
                {chosen.map((x) => (
                  <li key={x.id} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-sm">{x.name[lang]}</span>
                    <TextInput aria-label={`${x.name[lang]}: ${t('examForm.maxMarks')}`} inputMode="numeric" value={maxes[x.id]} onChange={(e) => setMaxes((cur) => ({ ...cur, [x.id]: e.target.value }))} className="w-24 text-center" aria-invalid={touched && !(Number(maxes[x.id]) > 0)} />
                  </li>
                ))}
              </ul>
              {touched && errors.max && <p className="text-xs font-medium text-red-fg">{errors.max}</p>}
              {exam && scored > 0 && <p className="text-xs text-muted">{t('examForm.keepMarks')}</p>}
            </fieldset>
          )}
        </div>
      </Dialog>
      <ConfirmDialog open={deleting} title={t('examForm.deleteTitle', { name: exam?.name ?? '' })} confirmLabel={t('common.delete')} onClose={() => setDeleting(false)} onConfirm={() => { if (exam) { useData.getState().remove('assessments', exam.id); onDeleted?.(); onClose(); } }}>
        {t('examForm.deleteBody', { n: n(scored) })}
      </ConfirmDialog>
    </>
  );
}
