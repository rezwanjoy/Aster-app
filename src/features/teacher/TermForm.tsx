import { useState } from 'react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Field, FormGrid, Select, TextInput } from '@/components/forms';
import { isValidISODate } from '@/lib/dates';
import { newId } from '@/lib/ops';
import { useData } from '@/store/data';
import { useAppData } from '@/store/hooks';
import type { Term } from '@/types';

type Props = { open: boolean; term: Term | null; onClose: () => void };

/** Add or edit a term / semester, and choose which one is current. */
export function TermForm(props: Props) {
  return props.open ? <Inner {...props} /> : null;
}

function Inner({ term, onClose }: Props) {
  const { t, lang } = useI18n();
  const data = useAppData();
  const [name, setName] = useState(term?.name ?? '');
  const [nameBn, setNameBn] = useState(term?.nameBn ?? '');
  const [start, setStart] = useState(term?.startDate ?? '');
  const [end, setEnd] = useState(term?.endDate ?? '');
  const [makeCurrent, setMakeCurrent] = useState(!term);
  const [touched, setTouched] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const errors = {
    name: !name.trim() ? t('forms.required') : undefined,
    start: !isValidISODate(start) ? t('forms.badDate') : undefined,
    end: !isValidISODate(end) ? t('forms.badDate') : isValidISODate(start) && end <= start ? t('termForm.endBeforeStart') : undefined,
  };

  const save = () => {
    setTouched(true);
    if (errors.name || errors.start || errors.end) return;
    const id = term?.id ?? newId('term');
    const s = useData.getState();
    s.upsert('terms', { id, name: name.trim(), nameBn: nameBn.trim() || undefined, startDate: start, endDate: end });
    if (makeCurrent) s.apply((d) => ({ ...d, currentTermId: id }));
    onClose();
  };

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        title={term ? t('termForm.editTitle') : t('termForm.addTitle')}
        footer={
          <>
            {term && data.terms.length > 1 && <Button variant="secondary" className="mr-auto text-red-fg" onClick={() => setDeleting(true)}>{t('common.delete')}</Button>}
            <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
            <Button onClick={save}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormGrid>
            <Field label={t('termForm.name')} error={touched ? errors.name : undefined}>
              {(id, d) => <TextInput id={id} aria-describedby={d} aria-invalid={touched && !!errors.name} value={name} onChange={(e) => setName(e.target.value)} placeholder="Semester 2 · 2026" />}
            </Field>
            <Field label={t('termForm.nameBn')}>{(id) => <TextInput id={id} value={nameBn} onChange={(e) => setNameBn(e.target.value)} />}</Field>
            <Field label={t('termForm.start')} error={touched ? errors.start : undefined}>
              {(id, d) => <TextInput id={id} type="date" aria-describedby={d} aria-invalid={touched && !!errors.start} value={start} onChange={(e) => setStart(e.target.value)} />}
            </Field>
            <Field label={t('termForm.end')} error={touched ? errors.end : undefined}>
              {(id, d) => <TextInput id={id} type="date" aria-describedby={d} aria-invalid={touched && !!errors.end} value={end} onChange={(e) => setEnd(e.target.value)} />}
            </Field>
          </FormGrid>
          {term ? (
            term.id !== data.currentTermId && (
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input type="checkbox" checked={makeCurrent} onChange={(e) => setMakeCurrent(e.target.checked)} className="size-5 accent-(--brand)" />
                {t('termForm.makeCurrent')}
              </label>
            )
          ) : (
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input type="checkbox" checked={makeCurrent} onChange={(e) => setMakeCurrent(e.target.checked)} className="size-5 accent-(--brand)" />
              {t('termForm.makeCurrent')}
            </label>
          )}
          {data.terms.length > 1 && !term && (
            <Field label={t('termForm.switch')}>
              {(id) => (
                <Select id={id} value={data.currentTermId} onChange={(e) => useData.getState().apply((d) => ({ ...d, currentTermId: e.target.value }))}>
                  {data.terms.map((x) => <option key={x.id} value={x.id}>{lang === 'bn' && x.nameBn ? x.nameBn : x.name}</option>)}
                </Select>
              )}
            </Field>
          )}
        </div>
      </Dialog>
      <ConfirmDialog open={deleting} title={t('termForm.deleteTitle', { name: term?.name ?? '' })} confirmLabel={t('common.delete')} onClose={() => setDeleting(false)} onConfirm={() => { if (term) useData.getState().removeTerm(term.id); onClose(); }}>
        {t('termForm.deleteBody')}
      </ConfirmDialog>
    </>
  );
}
