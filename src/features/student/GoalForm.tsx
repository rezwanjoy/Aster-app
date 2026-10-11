import { useState } from 'react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Field, FormGrid, TextInput, ToggleChip } from '@/components/forms';
import { goalFor, removeGoal, saveGoal } from '@/lib/goals';
import { percentToGrade, sorted } from '@/lib/grading';
import { useSettings } from '@/store/settings';
import { isValidISODate } from '@/lib/dates';
import { useData } from '@/store/data';
import { useAppData } from '@/store/hooks';

type Props = { open: boolean; studentId: string; subjectId: string; onClose: () => void };

/** The top four grades of the teacher's table (A+, A, A-, B by default) become one-tap targets. */
const QUICK_COUNT = 4;

/** Set the target for one subject: a percentage (with grade shortcuts) and an optional date. */
export function GoalForm(props: Props) {
  return props.open ? <Inner {...props} /> : null;
}

function Inner({ studentId, subjectId, onClose }: Props) {
  const { t, n, lang } = useI18n();
  const data = useAppData();
  const bands = useSettings((s) => s.gradeBands);
  const quick = sorted(bands).filter((b) => b.min >= 1).slice(0, QUICK_COUNT);
  const existing = goalFor(data, studentId, subjectId);
  const [pct, setPct] = useState(String(existing?.targetPercent ?? 80));
  const [by, setBy] = useState(existing?.byDate ?? '');
  const [touched, setTouched] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const value = Number(pct);
  const subject = data.subjects.find((s) => s.id === subjectId)?.name[lang] ?? '';
  const errors = {
    pct: !Number.isFinite(value) || value < 1 || value > 100 ? t('goalForm.badPercent') : undefined,
    by: by && !isValidISODate(by) ? t('forms.badDate') : undefined,
  };

  const save = () => {
    setTouched(true);
    if (errors.pct || errors.by) return;
    useData.getState().apply((d) => saveGoal(d, { studentId, subjectId, targetPercent: value, byDate: by || undefined }, bands));
    onClose();
  };

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        title={t('goalForm.title', { subject })}
        footer={
          <>
            {existing && <Button variant="secondary" className="mr-auto text-red-fg" onClick={() => setDeleting(true)}>{t('common.delete')}</Button>}
            <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
            <Button onClick={save}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t('goalForm.quick')}</legend>
            <div className="flex flex-wrap gap-2">
              {quick.map((b) => <ToggleChip key={b.letter} on={Number(pct) === b.min} onClick={() => setPct(String(b.min))}>{b.letter} · {n(b.min)}%</ToggleChip>)}
            </div>
          </fieldset>
          <FormGrid>
            <Field label={t('goalForm.percent')} error={touched ? errors.pct : undefined} hint={Number.isFinite(value) && value >= 1 && value <= 100 ? t('goalForm.equals', { grade: percentToGrade(value, bands).letter }) : undefined}>
              {(id, d) => <TextInput id={id} inputMode="numeric" aria-describedby={d} aria-invalid={touched && !!errors.pct} value={pct} onChange={(e) => setPct(e.target.value)} />}
            </Field>
            <Field label={t('goalForm.by')} error={touched ? errors.by : undefined}>
              {(id, d) => <TextInput id={id} type="date" aria-describedby={d} value={by} onChange={(e) => setBy(e.target.value)} />}
            </Field>
          </FormGrid>
          <p className="text-xs text-muted">{t('goalForm.note')}</p>
        </div>
      </Dialog>
      <ConfirmDialog open={deleting} title={t('goalForm.deleteTitle', { subject })} confirmLabel={t('common.delete')} onClose={() => setDeleting(false)} onConfirm={() => { useData.getState().apply((d) => removeGoal(d, studentId, subjectId)); onClose(); }}>
        {t('goalForm.deleteBody')}
      </ConfirmDialog>
    </>
  );
}
