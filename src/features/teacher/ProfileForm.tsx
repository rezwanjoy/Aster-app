import { useState } from 'react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { Field, FormGrid, TextInput } from '@/components/forms';
import { useData } from '@/store/data';
import { useAppData } from '@/store/hooks';
import type { Profile } from '@/types';

/** Edit the teacher's own details: name, coaching center, profession and phone (English + Bangla). */
export function ProfileForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  return open ? <Inner onClose={onClose} /> : null;
}

function Inner({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { profile } = useAppData();
  const [p, setP] = useState<Profile>(profile);
  const [touched, setTouched] = useState(false);
  const set = <K extends 'teacherName' | 'centerName' | 'profession'>(key: K, lang: 'en' | 'bn', value: string) => setP((cur) => ({ ...cur, [key]: { ...cur[key], [lang]: value } }));
  const missing = !p.teacherName.en.trim() || !p.centerName.en.trim();

  const save = () => {
    setTouched(true);
    if (missing) return;
    const clean = (x: { en: string; bn: string }) => ({ en: x.en.trim(), bn: x.bn.trim() || x.en.trim() });
    useData.getState().apply((d) => ({
      ...d,
      profile: { teacherName: clean(p.teacherName), centerName: clean(p.centerName), profession: clean(p.profession.en.trim() ? p.profession : { en: 'Teacher', bn: 'শিক্ষক' }), phone: p.phone?.trim() || undefined },
    }));
    onClose();
  };

  return (
    <Dialog open onClose={onClose} size="md" title={t('profile.editTitle')} footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={save}>{t('common.save')}</Button></>}>
      <div className="space-y-4">
        <FormGrid>
          <Field label={t('profile.nameEn')} error={touched && !p.teacherName.en.trim() ? t('forms.required') : undefined}>{(id, d) => <TextInput id={id} aria-describedby={d} value={p.teacherName.en} onChange={(e) => set('teacherName', 'en', e.target.value)} />}</Field>
          <Field label={t('profile.nameBn')}>{(id) => <TextInput id={id} value={p.teacherName.bn} onChange={(e) => set('teacherName', 'bn', e.target.value)} />}</Field>
          <Field label={t('profile.centerEn')} error={touched && !p.centerName.en.trim() ? t('forms.required') : undefined}>{(id, d) => <TextInput id={id} aria-describedby={d} value={p.centerName.en} onChange={(e) => set('centerName', 'en', e.target.value)} />}</Field>
          <Field label={t('profile.centerBn')}>{(id) => <TextInput id={id} value={p.centerName.bn} onChange={(e) => set('centerName', 'bn', e.target.value)} />}</Field>
          <Field label={t('profile.professionEn')}>{(id) => <TextInput id={id} value={p.profession.en} onChange={(e) => set('profession', 'en', e.target.value)} />}</Field>
          <Field label={t('profile.professionBn')}>{(id) => <TextInput id={id} value={p.profession.bn} onChange={(e) => set('profession', 'bn', e.target.value)} />}</Field>
        </FormGrid>
        <Field label={t('profile.phone')}>{(id) => <TextInput id={id} type="tel" inputMode="tel" value={p.phone ?? ''} onChange={(e) => setP((cur) => ({ ...cur, phone: e.target.value }))} />}</Field>
      </div>
    </Dialog>
  );
}
