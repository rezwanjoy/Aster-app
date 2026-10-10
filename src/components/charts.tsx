import { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useI18n } from '@/i18n';
import { cx } from './ui';

const EASE = [0.23, 1, 0.32, 1] as const;

/* ───────── Bar chart: bars grow from the baseline with a gold cap on the peak ───────── */
export function BarChart({
  data,
  highlight,
  average,
  height = 190,
  min = 0,
  ariaLabel,
}: {
  data: { label: string; value: number }[];
  highlight?: number;
  average?: number;
  height?: number;
  /** Axis start (e.g. 70 for attendance %); bars are drawn relative to min..100. */
  min?: number;
  ariaLabel: string;
}) {
  const { n } = useI18n();
  const reduce = useReducedMotion();
  const max = Math.max(100, ...data.map((d) => d.value));
  const frac = (v: number) => Math.max(0.04, (v - min) / (max - min));
  const peak = highlight ?? data.reduce((b, d, i, a) => (d.value > a[b].value ? i : b), 0);

  return (
    <div role="img" aria-label={ariaLabel} className="relative" style={{ height }}>
      {average !== undefined && (
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[1.6rem]">
          <div className="absolute inset-x-0 border-t border-dashed border-[color:var(--gold-line)]" style={{ bottom: `${frac(average) * 100}%` }}>
            <span className="num absolute -top-5 left-0 rounded-md bg-gold-soft px-1.5 text-[11px] font-semibold text-gold">{n(average)}%</span>
          </div>
        </div>
      )}
      <div className="absolute inset-0 flex items-end gap-1.5 sm:gap-2.5">
        {data.map((d, i) => (
          <div key={d.label} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
            <motion.div
              className="relative w-full origin-bottom rounded-t-xl"
              style={{
                height: `calc((100% - 1.6rem) * ${frac(d.value)})`,
                background: 'linear-gradient(to top, var(--bar-from), var(--bar-to))',
                boxShadow: i === peak ? '0 -6px 22px -4px var(--spot)' : undefined,
              }}
              initial={reduce ? false : { scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.1 + i * 0.05 }}
            >
              <span
                className={cx('absolute inset-x-0 top-0 h-0.5 rounded-full', i === peak ? 'bg-[#e3c98f] shadow-[0_0_10px_#e3c98f]' : 'bg-[#a595ff]')}
              />
              <span className="num pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] font-semibold opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                {n(d.value)}
              </span>
            </motion.div>
            <span className="h-[1.6rem] pt-1.5 text-center text-[11px] text-muted">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────── Line chart: smooth path draws in, area fades up ───────── */
const smooth = (pts: [number, number][]) =>
  pts.reduce((d, p, i, a) => {
    if (i === 0) return `M${p[0]},${p[1]}`;
    const prev = a[i - 1];
    const cx1 = prev[0] + (p[0] - prev[0]) / 2;
    return `${d} C${cx1},${prev[1]} ${cx1},${p[1]} ${p[0]},${p[1]}`;
  }, '');

export function LineChart({
  data,
  goal,
  min = 0,
  max = 100,
  ariaLabel,
}: {
  data: { label: string; value: number }[];
  goal?: number;
  /** Value range of the y axis (defaults 0-100). */
  min?: number;
  max?: number;
  ariaLabel: string;
}) {
  const id = useId();
  const reduce = useReducedMotion();
  const { n } = useI18n();
  const W = 420, H = 190, padX = 22, padTop = 18, padBottom = 30;
  const x = (i: number) => padX + (i * (W - padX * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => padTop + (1 - (v - min) / (max - min)) * (H - padTop - padBottom);
  const pts = data.map((d, i) => [x(i), y(d.value)] as [number, number]);
  const line = smooth(pts);
  const area = `${line} L${x(data.length - 1)},${H - padBottom} L${x(0)},${H - padBottom} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="h-auto w-full overflow-visible">
      <defs>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8f78ff" stopOpacity="0.4" />
          <stop offset="1" stopColor="#8f78ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-l`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8f78ff" />
          <stop offset="1" stopColor="#e3c98f" />
        </linearGradient>
      </defs>
      {[min, (min + max) / 2, max].map((g) => (
        <line key={g} x1={padX} x2={W - padX} y1={y(g)} y2={y(g)} stroke="currentColor" strokeOpacity="0.08" />
      ))}
      {goal !== undefined && (
        <g>
          <line x1={padX} x2={W - padX} y1={y(goal)} y2={y(goal)} stroke="#c9a45a" strokeDasharray="5 6" strokeOpacity="0.8" />
          <text x={W - padX} y={y(goal) - 6} textAnchor="end" fontSize="12" fontWeight="600" fill="#c9a45a">
            {n(goal)}%
          </text>
        </g>
      )}
      <motion.path d={area} fill={`url(#${id}-a)`} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }} />
      <motion.path
        d={line}
        fill="none"
        stroke={`url(#${id}-l)`}
        strokeWidth="3"
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.3, ease: EASE }}
      />
      {pts.map(([px, py], i) => (
        <g key={data[i].label}>
          <motion.circle
            cx={px}
            cy={py}
            r="4.5"
            fill="#14102b"
            stroke="#c9b8ff"
            strokeWidth="2"
            initial={reduce ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.5 + i * 0.12 }}
          />
          <text x={px} y={H - 8} textAnchor="middle" fontSize="12" fill="currentColor" fillOpacity="0.6">
            {data[i].label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ───────── Progress ring ───────── */
export function Ring({
  value,
  size = 112,
  stroke = 10,
  label,
  sub,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  sub?: string;
}) {
  const id = useId();
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label} ${sub ?? ''}`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a595ff" />
            <stop offset="1" stopColor="#e3c98f" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.min(100, value) / 100) }}
          transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
        <span className="num font-display text-xl font-semibold">{label}</span>
        {sub && <span className="text-[11px] text-muted">{sub}</span>}
      </div>
    </div>
  );
}

/* ───────── Thin progress bar with a "goal" tick ───────── */
export function ProgressBar({ value, goal, className }: { value: number; goal?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className={cx('relative h-2.5 w-full rounded-full bg-surface-2', className)} role="presentation">
      <motion.div
        className="h-full origin-left rounded-full bg-linear-to-r from-[#7c5cff] to-[#c9b8ff]"
        style={{ width: `${Math.min(100, value)}%` }}
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1, ease: EASE, delay: 0.2 }}
      />
      {goal !== undefined && (
        <span className="absolute -top-1 h-4.5 w-0.5 rounded-full bg-[#c9a45a]" style={{ left: `${goal}%` }} />
      )}
    </div>
  );
}
