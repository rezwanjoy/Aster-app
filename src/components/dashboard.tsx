import type { ComponentType, ReactNode, SVGProps } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { useI18n } from '@/i18n';
import { Card, MasteryBadge, bandOf, cx } from './ui';
import { CountUp, Reveal } from './motion';
import { IconAlert, IconArrowUpRight, IconMinus, IconTrend } from './icons';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

/* ───────── Stat tile ───────── */
export function StatCard({
  icon: Icon,
  label,
  value,
  prefix,
  suffix,
  hint,
  i = 0,
  onClick,
}: {
  onClick?: () => void;
  icon: Icon;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  hint?: string;
  i?: number;
}) {
  const body = (
    <>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted">{label}</p>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-line bg-brand-soft text-brand-text">
            <Icon width={18} height={18} />
          </span>
        </div>
        <p className="font-display mt-3 text-[1.65rem] leading-none font-semibold tracking-[-0.03em] sm:text-3xl">
          <CountUp value={value} prefix={prefix} suffix={suffix} />
        </p>
        {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </>
  );
  return (
    <Reveal i={i}>
      <Card className="h-full">
        {onClick ? (
          <button type="button" onClick={onClick} aria-label={`${label}: ${prefix ?? ''}${value}${suffix ?? ''}`} className="block w-full cursor-pointer text-left focus-visible:outline-offset-8">
            {body}
          </button>
        ) : (
          body
        )}
      </Card>
    </Reveal>
  );
}

/* ───────── Titled card section ───────── */
export function Section({
  title,
  action,
  children,
  className,
  i = 0,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  i?: number;
}) {
  return (
    <Reveal i={i} className={className}>
      <Card className="h-full">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h2 className="font-display text-base font-semibold tracking-[-0.015em] sm:text-lg">{title}</h2>
          {action}
        </div>
        {children}
      </Card>
    </Reveal>
  );
}

const barColour = {
  red: 'from-[#ef6b6b] to-[#b91c1c]',
  yellow: 'from-[#f2c14e] to-[#b7791f]',
  green: 'from-[#4ade80] to-[#15803d]',
  unknown: 'from-[#9a96b0] to-[#6b6785]',
};

/* ───────── Weak-topic row: label, animated bar, value ───────── */
export function TopicBar({
  name,
  badge,
  value,
  valueLabel,
  tone,
  i = 0,
}: {
  name: string;
  /** small extra shown under the name (e.g. a trend or a Reteach chip) */
  badge?: ReactNode;
  /** 0-100 bar fill */
  value: number;
  valueLabel: string;
  /** colour band (derived from mastery, or forced for "% weak" bars) */
  tone: 'red' | 'yellow' | 'green' | 'unknown';
  i?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <li className="flex items-center gap-3">
      <span className="w-[40%] min-w-0 text-sm leading-snug sm:w-[34%]" title={name}>
        {name}
        {badge && <span className="mt-0.5 block">{badge}</span>}
      </span>
      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <motion.span
          className={cx('block h-full origin-left rounded-full bg-linear-to-r', barColour[tone])}
          style={{ width: `${value}%` }}
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1], delay: 0.15 + i * 0.05 }}
        />
      </span>
      <span className="num w-12 shrink-0 text-right text-sm font-semibold">{valueLabel}</span>
    </li>
  );
}

/* ───────── Person row (students needing attention, fees…) ───────── */
export function PersonRow({
  name,
  meta,
  right,
  to,
}: {
  /** make the name a link (e.g. to the student page) */
  to?: string;
  name: string;
  meta?: ReactNode;
  right?: ReactNode;
}) {
  return (
    // On narrow screens the right-hand controls wrap onto their own line so the name stays readable.
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
      <span className="font-display flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-brand-soft text-sm font-semibold text-brand-text">
        {name.charAt(0)}
      </span>
      <span className="min-w-0 flex-1 basis-40">
        <span className="block text-sm font-semibold sm:truncate">{to ? <Link to={to} className="hover:underline">{name}</Link> : name}</span>
        {meta && <span className="block text-xs text-muted">{meta}</span>}
      </span>
      {right && <span className="flex max-sm:w-full max-sm:justify-end sm:ml-auto">{right}</span>}
    </li>
  );
}

/* ───────── Mastery % pill with band icon + label ───────── */
export function MasteryPill({ pct }: { pct: number }) {
  const { t, n } = useI18n();
  const band = bandOf(pct);
  return <MasteryBadge band={band} label={`${n(pct)}% · ${t(`mastery.${band}`)}`} />;
}

/* ───────── Trend arrow with text label (never colour alone) ───────── */
export function Trend({ trend }: { trend: 'up' | 'flat' | 'down' }) {
  const { t } = useI18n();
  const map = {
    up: { Icon: IconArrowUpRight, cls: 'text-green-fg' },
    flat: { Icon: IconMinus, cls: 'text-muted' },
    down: { Icon: IconTrend, cls: 'text-red-fg' },
  } as const;
  const { Icon, cls } = map[trend];
  return (
    <span className={cx('inline-flex items-center gap-1 text-xs font-medium', cls)}>
      {trend === 'down' ? <IconAlert width={14} height={14} /> : <Icon width={14} height={14} />}
      {t(`trend.${trend}`)}
    </span>
  );
}
