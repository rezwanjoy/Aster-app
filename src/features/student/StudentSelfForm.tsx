import { useState } from 'react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { Field, FormGrid, TextInput } from '@/components/forms';
import { normalizePhone } from '@/lib/whatsapp';
import { useData } from '@/store/data';
import type { Student } from '@/types';

/** What a student can change about themselves: their name and their guardian's contact. */
export function StudentSelfForm({ open, student, onClose }: { open: boolean; student: Student; onClose: () => void }) {
  return open ? <Inner student={student} onClose={onClose} /> : null;
}

function Inner({ student, onClose }: { student: Student; onClose: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(student.name);
  const [nameBn, setNameBn] = useState(student.nameBn ?? '');
  const [guardian, setGuardian] = useState(student.guardianName ?? '');
  const [phone, setPhone] = useState(student.guardianPhone ?? '');
  const [touched, setTouched] = useState(false);
  const errors = {
    name: !name.trim() ? t('forms.required') : undefined,
    phone: phone.trim() && !normalizePhone(phone) ? t('studentForm.badPhone') : undefined,
  };

  const save = () => {
    setTouched(true);
    if (errors.name || errors.phone) return;
    useData.getState().patch('students', student.id, {
      name: name.trim(),
      nameBn: nameBn.trim() || undefined,
      guardianName: guardian.trim() || undefined,
      guardianPhone: phone.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title={t('studentForm.editTitle')} footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={save}>{t('common.save')}</Button></>}>
      <div className="space-y-4">
        <FormGrid>
          <Field label={t('studentForm.name')} error={touched ? errors.name : undefined}>{(id, d) => <TextInput id={id} aria-describedby={d} aria-invalid={touched && !!errors.name} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
          <Field label={t('studentForm.nameBn')}>{(id) => <TextInput id={id} value={nameBn} onChange={(e) => setNameBn(e.target.value)} />}</Field>
          <Field label={t('studentForm.guardian')}>{(id) => <TextInput id={id} value={guardian} onChange={(e) => setGuardian(e.target.value)} />}</Field>
          <Field label={t('studentForm.phone')} error={touched ? errors.phone : undefined}>{(id, d) => <TextInput id={id} type="tel" inputMode="tel" aria-describedby={d} aria-invalid={touched && !!errors.phone} value={phone} onChange={(e) => setPhone(e.target.value)} />}</Field>
        </FormGrid>
        <p className="text-xs text-muted">{t('profile.studentEditNote')}</p>
      </div>
    </Dialog>
  );
}
