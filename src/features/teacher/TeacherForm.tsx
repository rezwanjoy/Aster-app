import { useState } from 'react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Field, FormGrid, TextInput } from '@/components/forms';
import { newId } from '@/lib/ops';
import { useData } from '@/store/data';
import type { Teacher } from '@/types';

type Props = { open: boolean; teacher: Teacher | null; onClose: () => void };

/** Add or edit a teacher. Removing one leaves their batches without a teacher. */
export function TeacherForm(props: Props) {
  return props.open ? <Inner {...props} /> : null;
}

function Inner({ teacher, onClose }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState(teacher?.name ?? '');
  const [nameBn, setNameBn] = useState(teacher?.nameBn ?? '');
  const [phone, setPhone] = useState(teacher?.phone ?? '');
  const [salary, setSalary] = useState(teacher?.monthlySalary ? String(teacher.monthlySalary) : '');
  const [touched, setTouched] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const error = !name.trim() ? t('forms.required') : undefined;
  const salaryNum = Number(salary);
  const salaryError = salary.trim() !== '' && (!Number.isFinite(salaryNum) || salaryNum < 0) ? t('forms.badNumber') : undefined;

  const save = () => {
    setTouched(true);
    if (error || salaryError) return;
    useData.getState().upsert('teachers', { id: teacher?.id ?? newId('t'), name: name.trim(), nameBn: nameBn.trim() || undefined, phone: phone.trim() || undefined, monthlySalary: salary.trim() ? salaryNum : undefined });
    onClose();
  };

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        title={teacher ? t('teacherForm.editTitle') : t('teacherForm.addTitle')}
        footer={
          <>
            {teacher && <Button variant="secondary" className="mr-auto text-red-fg" onClick={() => setDeleting(true)}>{t('common.delete')}</Button>}
            <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
            <Button onClick={save}>{t('common.save')}</Button>
          </>
        }
      >
        <FormGrid cols={1}>
          <Field label={t('teacherForm.name')} error={touched ? error : undefined}>
            {(id, d) => <TextInput id={id} aria-describedby={d} aria-invalid={touched && !!error} value={name} onChange={(e) => setName(e.target.value)} placeholder="Karim Sir" />}
          </Field>
          <Field label={t('teacherForm.nameBn')}>{(id) => <TextInput id={id} value={nameBn} onChange={(e) => setNameBn(e.target.value)} />}</Field>
          <Field label={t('teacherForm.phone')}>{(id) => <TextInput id={id} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}</Field>
          <Field label={t('teacherForm.salary')} hint={t('teacherForm.salaryHint')} error={touched ? salaryError : undefined}>
            {(id, d) => <TextInput id={id} aria-describedby={d} inputMode="numeric" aria-invalid={touched && !!salaryError} value={salary} onChange={(e) => setSalary(e.target.value)} />}
          </Field>
        </FormGrid>
      </Dialog>
      <ConfirmDialog
        open={deleting}
        title={t('teacherForm.deleteTitle', { name: teacher?.name ?? '' })}
        confirmLabel={t('common.delete')}
        onClose={() => setDeleting(false)}
        onConfirm={() => {
          if (teacher) useData.getState().removeTeacher(teacher.id);
          onClose();
        }}
      >
        {t('teacherForm.deleteBody')}
      </ConfirmDialog>
    </>
  );
}
