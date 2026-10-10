import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cx } from './ui';
import { useI18n } from '@/i18n';
import { WEEKDAYS } from '@/data/presets';

export const fieldClass =
  'min-h-11 w-full rounded-2xl border border-line-strong bg-surface-2 px-3.5 text-sm text-fg placeholder:text-muted/70 transition-colors focus:border-[color:var(--ring)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] aria-[invalid=true]:border-red-fg';

/** Label + control + optional hint/error. Pass the control as a render function to get its id. */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const descId = hint || error ? `${id}-d` : undefined;
  return (
    <div className={cx('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children(id, descId)}
      {(error || hint) && (
        <p id={descId} className={cx('text-xs', error ? 'font-medium text-red-fg' : 'text-muted')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export const TextInput = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input className={cx(fieldClass, className)} {...p} />;
export const Select = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select className={cx(fieldClass, 'pr-8', className)} {...p} />;
export const TextArea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cx(fieldClass, 'min-h-24 py-2.5', className)} {...p} />
);

/** A toggle chip (multi-select item). */
export function ToggleChip({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'press min-h-11 cursor-pointer rounded-2xl border px-3.5 text-sm font-medium disabled:opacity-50',
        on ? 'border-transparent bg-brand text-brand-fg shadow-glow' : 'border-line-strong bg-surface-2 text-muted hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}

/** Pick days of the week (0 = Sunday). */
export function DayPicker({ value, onChange, label }: { value: number[]; onChange: (days: number[]) => void; label: string }) {
  const { lang } = useI18n();
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((d) => d !== id) : [...value, id].sort());
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {WEEKDAYS.map((d) => (
        <ToggleChip key={d.id} on={value.includes(d.id)} onClick={() => toggle(d.id)}>
          {d[lang]}
        </ToggleChip>
      ))}
    </div>
  );
}

/** A small stack of fields. */
export const FormGrid = ({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 }) => (
  <div className={cx('grid gap-4', cols === 2 && 'sm:grid-cols-2')}>{children}</div>
);
