import { useState } from 'react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Field, FormGrid, TextInput, ToggleChip } from '@/components/forms';
import { normalizePhone } from '@/lib/whatsapp';
import { newId } from '@/lib/ops';
import { useData } from '@/store/data';
import { useAppData } from '@/store/hooks';
import type { Student } from '@/types';

type Props = { open: boolean; student: Student | null; defaultBatchId?: string; onClose: () => void; onDeleted?: () => void };

/** Add or edit a student: name, class, batches and guardian contact. */
export function StudentForm(props: Props) {
  return props.open ? <Inner {...props} /> : null;
}

function Inner({ student, defaultBatchId, onClose, onDeleted }: Props) {
  const { t } = useI18n();
  const data = useAppData();
  const [name, setName] = useState(student?.name ?? '');
  const [nameBn, setNameBn] = useState(student?.nameBn ?? '');
  const [className, setClassName] = useState(student?.className ?? data.batches.find((b) => b.id === defaultBatchId)?.level ?? 'Class 10');
  const [batchIds, setBatchIds] = useState<string[]>(student?.batchIds ?? (defaultBatchId ? [defaultBatchId] : []));
  const [guardianName, setGuardianName] = useState(student?.guardianName ?? '');
  const [guardianPhone, setGuardianPhone] = useState(student?.guardianPhone ?? '');
  const [touched, setTouched] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const errors = {
    name: !name.trim() ? t('forms.required') : undefined,
    batches: batchIds.length === 0 ? t('studentForm.pickBatch') : undefined,
    phone: guardianPhone.trim() && !normalizePhone(guardianPhone) ? t('studentForm.badPhone') : undefined,
  };

  const save = () => {
    setTouched(true);
    if (errors.name || errors.batches || errors.phone) return;
    useData.getState().upsert('students', {
      id: student?.id ?? newId('s'),
      name: name.trim(),
      nameBn: nameBn.trim() || undefined,
      className: className.trim(),
      batchIds,
      guardianName: guardianName.trim() || undefined,
      guardianPhone: guardianPhone.trim() || undefined,
      studyDays: student?.studyDays ?? [0, 1, 2, 3, 4],
      dailyMinutes: student?.dailyMinutes ?? 15,
    });
    onClose();
  };

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        size="md"
        title={student ? t('studentForm.editTitle') : t('students.add')}
        footer={
          <>
            {student && <Button variant="secondary" className="mr-auto text-red-fg" onClick={() => setDeleting(true)}>{t('common.delete')}</Button>}
            <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
            <Button onClick={save}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormGrid>
            <Field label={t('studentForm.name')} error={touched ? errors.name : undefined}>
              {(id, d) => <TextInput id={id} aria-describedby={d} aria-invalid={touched && !!errors.name} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />}
            </Field>
            <Field label={t('studentForm.nameBn')}>{(id) => <TextInput id={id} value={nameBn} onChange={(e) => setNameBn(e.target.value)} autoComplete="off" />}</Field>
          </FormGrid>
          <Field label={t('studentForm.class')}>{(id) => <TextInput id={id} value={className} onChange={(e) => setClassName(e.target.value)} />}</Field>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t('studentForm.batches')}</legend>
            <div className="flex flex-wrap gap-2">
              {data.batches.map((b) => (
                <ToggleChip key={b.id} on={batchIds.includes(b.id)} onClick={() => setBatchIds((cur) => (cur.includes(b.id) ? cur.filter((x) => x !== b.id) : [...cur, b.id]))}>
                  {b.name}
                </ToggleChip>
              ))}
            </div>
            {touched && errors.batches && <p className="text-xs font-medium text-red-fg">{errors.batches}</p>}
          </fieldset>
          <FormGrid>
            <Field label={t('studentForm.guardian')}>{(id) => <TextInput id={id} value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />}</Field>
            <Field label={t('studentForm.phone')} hint={t('studentForm.phoneHint')} error={touched ? errors.phone : undefined}>
              {(id, d) => <TextInput id={id} type="tel" inputMode="tel" aria-describedby={d} aria-invalid={touched && !!errors.phone} value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} />}
            </Field>
          </FormGrid>
        </div>
      </Dialog>
      <ConfirmDialog
        open={deleting}
        title={t('studentForm.deleteTitle', { name: student?.name ?? '' })}
        confirmLabel={t('common.delete')}
        onClose={() => setDeleting(false)}
        onConfirm={() => {
          if (!student) return;
          useData.getState().removeStudent(student.id);
          onDeleted?.();
          onClose();
        }}
      >
        {t('studentForm.deleteBody')}
      </ConfirmDialog>
    </>
  );
}
