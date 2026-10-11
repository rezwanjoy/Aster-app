import { useId, useState } from 'react';
import { useI18n, type TKey } from '@/i18n';
import { Button, Segmented } from '@/components/ui';
import { IconMinus } from '@/components/icons';
import { Dialog } from '@/components/Dialog';
import { TextInput } from '@/components/forms';
import { DEFAULT_GRADE_BANDS, bandProblems, percentToGrade, sorted, type BandProblem } from '@/lib/grading';
import { useSettings } from '@/store/settings';
import type { GradeBand, GradingScale } from '@/types';

type Row = { key: string; letter: string; min: string; gpa: string };
type Props = { open: boolean; onClose: () => void };

const toRows = (bands: GradeBand[]): Row[] => sorted(bands).map((b, i) => ({ key: `r${i}`, letter: b.letter, min: String(b.min), gpa: String(b.gpa) }));
const num = (s: string) => (s.trim() === '' ? Number.NaN : Number(s));

/** The teacher's own grade table: how marks are worded (percent / GPA / letter) and where each grade starts. */
export function GradingSheet(props: Props) {
  return props.open ? <Inner {...props} /> : null;
}

function Inner({ onClose }: Props) {
  const { t, n } = useI18n();
  const { gradingScale, gradeBands, patchSettings } = useSettings();
  const [scale, setScale] = useState<GradingScale>(gradingScale);
  const [rows, setRows] = useState<Row[]>(() => toRows(gradeBands));
  const [sample, setSample] = useState('72');
  const next = useId();
  const [counter, setCounter] = useState(rows.length);

  const bands: GradeBand[] = rows.map((r) => ({ letter: r.letter.trim(), min: num(r.min), gpa: num(r.gpa) }));
  const problems = bandProblems(bands);
  const say = (p: BandProblem) => t(`gradingSheet.err.${p.code}` as TKey, { letter: 'letter' in p ? p.letter : '', lower: 'lower' in p ? p.lower : '', higher: 'higher' in p ? p.higher : '' });

  const edit = (key: string, field: 'letter' | 'min' | 'gpa', value: string) => setRows((cur) => cur.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  const add = () => {
    setRows((cur) => [...cur, { key: `${next}${counter}`, letter: '', min: '', gpa: '' }]);
    setCounter((c) => c + 1);
  };
  const reset = () => {
    setRows(toRows(DEFAULT_GRADE_BANDS));
    setCounter(DEFAULT_GRADE_BANDS.length);
  };
  const save = () => {
    if (problems.length) return;
    patchSettings({ gradingScale: scale, gradeBands: sorted(bands) });
    onClose();
  };

  const pct = Number(sample);
  const sampleOk = sample.trim() !== '' && Number.isFinite(pct) && pct >= 0 && pct <= 100;
  const sampleGrade = sampleOk && problems.length === 0 ? percentToGrade(pct, bands) : null;

  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      title={t('gradingSheet.title')}
      footer={
        <>
          <Button variant="secondary" className="mr-auto" onClick={reset}>{t('gradingSheet.reset')}</Button>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={save} disabled={problems.length > 0}>{t('common.save')}</Button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-muted">{t('gradingSheet.intro')}</p>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t('gradingSheet.show')}</p>
          <Segmented<GradingScale>
            label={t('gradingSheet.show')}
            value={scale}
            onChange={setScale}
            className="w-full"
            options={[
              { value: 'percent', label: t('profile.gradingPercent') },
              { value: 'letter', label: t('profile.gradingLetter') },
              { value: 'gpa5', label: t('profile.gradingGpa') },
            ]}
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t('gradingSheet.table')}</legend>
          <div className="grid grid-cols-[1fr_1fr_1fr_2.75rem] items-end gap-2 text-xs font-medium text-muted" aria-hidden="true">
            <span>{t('gradingSheet.grade')}</span>
            <span>{t('gradingSheet.from')}</span>
            <span>{t('gradingSheet.gpa')}</span>
            <span />
          </div>
          <ul className="space-y-2">
            {rows.map((r, i) => (
              <li key={r.key} className="grid grid-cols-[1fr_1fr_1fr_2.75rem] items-center gap-2">
                <TextInput aria-label={t('gradingSheet.gradeN', { n: n(i + 1) })} value={r.letter} maxLength={6} placeholder="A+" onChange={(e) => edit(r.key, 'letter', e.target.value)} aria-invalid={!r.letter.trim()} />
                <TextInput aria-label={t('gradingSheet.fromN', { n: n(i + 1) })} inputMode="decimal" value={r.min} placeholder="80" onChange={(e) => edit(r.key, 'min', e.target.value)} />
                <TextInput aria-label={t('gradingSheet.gpaN', { n: n(i + 1) })} inputMode="decimal" value={r.gpa} placeholder="5.00" onChange={(e) => edit(r.key, 'gpa', e.target.value)} />
                <button
                  type="button"
                  aria-label={t('gradingSheet.remove', { grade: r.letter || n(i + 1) })}
                  disabled={rows.length <= 1}
                  onClick={() => setRows((cur) => cur.filter((x) => x.key !== r.key))}
                  className="press flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-2xl border border-line-strong bg-surface-2 text-muted hover:text-red-fg disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <IconMinus width={16} height={16} />
                </button>
              </li>
            ))}
          </ul>
          <Button variant="secondary" onClick={add}>+ {t('gradingSheet.add')}</Button>
          <p className="text-xs text-muted">{t('gradingSheet.hint')}</p>
          {problems.length > 0 && (
            <ul role="alert" className="space-y-1 text-xs font-medium text-red-fg">
              {problems.map((p, i) => <li key={i}>{say(p)}</li>)}
            </ul>
          )}
        </fieldset>

        <div className="rounded-2xl border border-line bg-surface-2 p-3">
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{t('gradingSheet.try')}</p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-24 shrink-0"><TextInput aria-label={t('gradingSheet.tryLabel')} inputMode="decimal" value={sample} onChange={(e) => setSample(e.target.value)} className="text-center" /></div>
            <span aria-hidden="true">%</span>
            <span aria-hidden="true">→</span>
            <p aria-live="polite" className="num text-sm font-semibold">
              {sampleGrade ? `${sampleGrade.letter} · GPA ${sampleGrade.gpa.toFixed(2)}` : '–'}
            </p>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
