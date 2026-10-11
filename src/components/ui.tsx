import { useId, useRef, type ButtonHTMLAttributes, type HTMLAttributes, type PointerEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { IconAlert, IconCheck, IconMinus } from './icons';

export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

/** Spring used for every sliding indicator (duration 0.25-0.4, bounce ≤ 0.1). */
export const UI_SPRING = { type: 'spring', duration: 0.38, bounce: 0.1 } as const;

/* ───────── Button ───────── */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

const buttonVariants = {
  primary: 'btn-primary',
  secondary: 'border border-line-strong bg-glass text-fg hover:bg-surface-2',
  ghost: 'text-fg hover:bg-surface-2',
};

export function Button({ variant = 'primary', className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'press inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        buttonVariants[variant],
        className,
      )}
      {...rest}
    />
  );
}

/* ───────── Icon-only button (44px touch target) ───────── */
export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'press inline-flex size-11 cursor-pointer items-center justify-center rounded-2xl text-fg hover:bg-surface-2',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ───────── Card: glass surface + cursor-following spotlight (mouse only) ───────── */
export function Card({
  className,
  hero,
  onPointerMove,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { hero?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(e);
    if (e.pointerType !== 'mouse' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--mx', `${e.clientX - r.left}px`);
    ref.current.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <div
      ref={ref}
      onPointerMove={hero ? onPointerMove : move}
      className={cx(hero ? 'hero-card' : 'glass', 'rounded-[1.75rem] p-4 sm:p-5', className)}
      {...rest}
    />
  );
}

/* ───────── Segmented control with a sliding spring indicator ───────── */
export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  ariaLabel?: string;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div
      role="group"
      aria-label={label}
      className={cx('inline-flex rounded-full border border-line bg-surface-2 p-0.5', className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            aria-label={o.ariaLabel}
            onClick={() => onChange(o.value)}
            className={cx(
              'press relative inline-flex min-h-11 min-w-11 flex-1 cursor-pointer whitespace-nowrap items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium',
              active ? 'text-brand-fg' : 'text-muted hover:text-fg',
            )}
          >
            {active && (
              <motion.span
                layoutId={id}
                transition={UI_SPRING}
                className="absolute inset-0 rounded-full bg-linear-to-br from-[#7c5cff] to-[#4a2cc0] shadow-glow"
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ───────── Mastery badge: colour + icon + label, never colour alone ───────── */
export type MasteryBand = 'red' | 'yellow' | 'green' | 'unknown';

const bandStyle: Record<MasteryBand, string> = {
  red: 'bg-red-bg text-red-fg',
  yellow: 'bg-yellow-bg text-yellow-fg',
  green: 'bg-green-bg text-green-fg',
  unknown: 'bg-unknown-bg text-unknown-fg',
};
const bandIcon = { red: IconAlert, yellow: IconMinus, green: IconCheck, unknown: IconMinus };

export function MasteryBadge({ band, label }: { band: MasteryBand; label: string }) {
  const Icon = bandIcon[band];
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', bandStyle[band])}>
      <Icon width={14} height={14} strokeWidth={2.25} />
      {label}
    </span>
  );
}

/** Band for a 0-100 mastery value (thresholds from the brief: <50 red, 50-69 yellow, ≥70 green). */
export const bandOf = (pct: number): MasteryBand => (pct < 50 ? 'red' : pct < 70 ? 'yellow' : 'green');

/* ───────── Small label chips ───────── */
export function Chip({ tone = 'brand', children, className }: { tone?: 'brand' | 'gold' | 'muted'; children: ReactNode; className?: string }) {
  const tones = {
    brand: 'bg-brand-soft text-brand-text',
    gold: 'bg-gold-soft text-gold border border-[color:var(--gold-line)]',
    muted: 'bg-surface-2 text-muted',
  };
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>
      {children}
    </span>
  );
}
