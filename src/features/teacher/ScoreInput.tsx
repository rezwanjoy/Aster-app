import { forwardRef, useEffect, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cx } from '@/components/ui';

interface Props {
  value: number | null;
  max: number;
  label: string;
  onCommit: (value: number | null) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  onPaste?: (e: ClipboardEvent<HTMLInputElement>) => void;
  className?: string;
  size?: 'sm' | 'lg';
}

/**
 * One marks cell. Valid numbers (0 to max) are saved as you type; an empty cell clears the mark;
 * anything else is flagged and not saved. Leaving the cell snaps it back to the saved value.
 */
export const ScoreInput = forwardRef<HTMLInputElement, Props>(function ScoreInput({ value, max, label, onCommit, onKeyDown, onPaste, className, size = 'sm' }, ref) {
  const show = (v: number | null) => (v === null ? '' : String(v));
  const [text, setText] = useState(show(value));

  // When the saved value changes from outside (a paste, another view), show it, but never
  // rewrite what the user is typing if it already means the same number (e.g. "7." while typing 7.5).
  useEffect(() => {
    setText((cur) => {
      const num = cur.trim() === '' ? null : Number(cur);
      return num === value ? cur : show(value);
    });
  }, [value]);

  const trimmed = text.trim();
  const parsed = trimmed === '' ? null : Number(trimmed);
  const invalid = parsed !== null && (!Number.isFinite(parsed) || parsed < 0 || parsed > max);

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      aria-label={label}
      aria-invalid={invalid}
      value={text}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={() => setText(show(value))}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        const v = next.trim() === '' ? null : Number(next);
        if (v === null || (Number.isFinite(v) && v >= 0 && v <= max)) onCommit(v);
      }}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      className={cx(
        'num rounded-xl border border-line-strong bg-surface-2 text-center font-semibold transition-colors focus:border-[color:var(--ring)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]',
        size === 'lg' ? 'min-h-14 w-28 text-2xl' : 'min-h-11 w-20 text-sm',
        invalid && 'border-red-fg bg-red-bg text-red-fg',
        className,
      )}
    />
  );
});
