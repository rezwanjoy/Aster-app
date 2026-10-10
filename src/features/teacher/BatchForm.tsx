import { useState } from 'react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DayPicker, Field, FormGrid, Select, TextInput, ToggleChip } from '@/components/forms';
import { newId, studentsOnlyIn } from '@/lib/ops';
import { useData } from '@/store/data';
import { useAppData } from '@/store/hooks';
import type { Batch } from '@/types';
import { SubjectManager } from './SubjectManager';

type Props = { open: boolean; batch: Batch | null; onClose: () => void; onSaved?: (id: string) => void; onDeleted?: () => void };

/** Add or edit a batch. Editing also offers delete (with a count of what goes with it). */
export function BatchForm(props: Props) {
  return props.open ? <Inner {...props} /> : null;
}

function Inner({ batch, onClose, onSaved, onDeleted }: Props) {
  const { t, lang } = useI18n();
  const data = useAppData();
  const [name, setName] = useState(batch?.name ?? '');
  const [nameBn, setNameBn] = useState(batch?.nameBn ?? '');
  const [level, setLevel] = useState(batch?.level ?? 'Class 10');
  const [subjectIds, setSubjectIds] = useState<string[]>(batch?.subjectIds ?? []);
  const [classDays, setClassDays] = useState<number[]>(batch?.classDays ?? [0, 2, 4]);
  const [startTime, setStartTime] = useState(batch?.startTime ?? '17:00');
  const [fee, setFee] = useState(String(batch?.monthlyFee ?? 1000));
  const [teacherId, setTeacherId] = useState(batch?.teacherId ?? '');
  const [termId, setTermId] = useState(batch?.termId ?? data.currentTermId);
  const [touched, setTouched] = useState(false);
  const [subjects, setSubjects] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const feeNum = Number(fee);
  const errors = {
    name: !name.trim() ? t('forms.required') : undefined,
    subjects: subjectIds.length === 0 ? t('batchForm.pickSubject') : undefined,
    fee: fee.trim() === '' || !Number.isFinite(feeNum) || feeNum < 0 ? t('forms.badNumber') : undefined,
  };

  const save = () => {
    setTouched(true);
    if (errors.name || errors.subjects || errors.fee) return;
    const id = batch?.id ?? newId('b');
    useData.getState().upsert('batches', {
      id, teacherId: teacherId || undefined, name: name.trim(), nameBn: nameBn.trim() || undefined, level: level.trim(), subjectIds, termId, classDays,
      startTime: startTime || undefined, monthlyFee: feeNum,
    });
    onSaved?.(id);
    onClose();
  };

  const orphans = batch ? studentsOnlyIn(data, batch.id).length : 0;

  return (
    <>
      <Dialog
        open={!subjects}
        onClose={onClose}
        size="md"
        title={batch ? t('batchForm.editTitle') : t('batchForm.addTitle')}
        footer={
          <>
            {batch && <Button variant="secondary" className="mr-auto text-red-fg" onClick={() => setDeleting(true)}>{t('common.delete')}</Button>}
            <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
            <Button onClick={save}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormGrid>
            <Field label={t('batchForm.name')} error={touched ? errors.name : undefined}>
              {(id, d) => <TextInput id={id} aria-describedby={d} aria-invalid={touched && !!errors.name} value={name} onChange={(e) => setName(e.target.value)} placeholder="Class 10 Mathematics" />}
            </Field>
            <Field label={t('batchForm.nameBn')}>{(id) => <TextInput id={id} value={nameBn} onChange={(e) => setNameBn(e.target.value)} />}</Field>
            <Field label={t('batchForm.level')}>{(id) => <TextInput id={id} value={level} onChange={(e) => setLevel(e.target.value)} />}</Field>
            {data.teachers.length > 0 && (
              <Field label={t('batchForm.teacher')}>
                {(id) => (
                  <Select id={id} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                    <option value="">{t('batchForm.noTeacher')}</option>
                    {data.teachers.map((x) => (
                      <option key={x.id} value={x.id}>{lang === 'bn' && x.nameBn ? x.nameBn : x.name}</option>
                    ))}
                  </Select>
                )}
              </Field>
            )}
            <Field label={t('batchForm.term')}>
              {(id) => (
                <Select id={id} value={termId} onChange={(e) => setTermId(e.target.value)}>
                  {data.terms.map((x) => (
                    <option key={x.id} value={x.id}>{lang === 'bn' && x.nameBn ? x.nameBn : x.name}</option>
                  ))}
                </Select>
              )}
            </Field>
          </FormGrid>

          <fieldset className="space-y-2">
            <legend className="flex w-full items-center justify-between text-sm font-medium">
              {t('batchForm.subjects')}
              <button type="button" onClick={() => setSubjects(true)} className="cursor-pointer text-xs font-semibold text-brand-text hover:underline">{t('subjects.manage')}</button>
            </legend>
            <div className="flex flex-wrap gap-2">
              {data.subjects.map((s) => (
                <ToggleChip key={s.id} on={subjectIds.includes(s.id)} onClick={() => setSubjectIds((cur) => (cur.includes(s.id) ? cur.filter((x) => x !== s.id) : [...cur, s.id]))}>
                  {s.name[lang]}
                </ToggleChip>
              ))}
            </div>
            {touched && errors.subjects && <p className="text-xs font-medium text-red-fg">{errors.subjects}</p>}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t('batchForm.classDays')}</legend>
            <DayPicker value={classDays} onChange={setClassDays} label={t('batchForm.classDays')} />
          </fieldset>

          <FormGrid>
            <Field label={t('batchForm.time')}>{(id) => <TextInput id={id} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />}</Field>
            <Field label={t('batchForm.fee')} error={touched ? errors.fee : undefined}>
              {(id, d) => <TextInput id={id} inputMode="numeric" aria-describedby={d} aria-invalid={touched && !!errors.fee} value={fee} onChange={(e) => setFee(e.target.value)} />}
            </Field>
          </FormGrid>
        </div>
      </Dialog>

      <SubjectManager open={subjects} onClose={() => setSubjects(false)} />
      <ConfirmDialog
        open={deleting}
        title={t('batchForm.deleteTitle', { name: batch?.name ?? '' })}
        confirmLabel={t('common.delete')}
        onClose={() => setDeleting(false)}
        onConfirm={() => {
          if (!batch) return;
          useData.getState().removeBatch(batch.id);
          onDeleted?.();
          onClose();
        }}
      >
        {t('batchForm.deleteBody', { students: orphans })}
      </ConfirmDialog>
    </>
  );
}
