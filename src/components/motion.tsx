import { useEffect, useState, type ReactNode } from 'react';
import { animate, motion, useReducedMotion } from 'motion/react';
import { useI18n } from '@/i18n';

const EASE_ENTER = [0.23, 1, 0.32, 1] as const;

/** Staggered fade/rise on mount. `i` is the position in the stagger sequence. */
export function Reveal({ i = 0, className, children }: { i?: number; className?: string; children: ReactNode }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE_ENTER, delay: Math.min(i, 10) * 0.06 }}
    >
      {children}
    </motion.div>
  );
}

/** Counts from 0 to `value` once, formatted with the active language/numerals. */
export function CountUp({
  value,
  prefix = '',
  suffix = '',
  duration = 1.1,
  options,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  options?: Intl.NumberFormatOptions;
}) {
  const { n } = useI18n();
  const reduce = useReducedMotion();
  const [current, setCurrent] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setCurrent(value);
      return;
    }
    const controls = animate(0, value, { duration, ease: EASE_ENTER, onUpdate: setCurrent });
    return () => controls.stop();
  }, [value, duration, reduce]);

  return (
    <span className="num">
      {prefix}
      {n(Math.round(current * 10) / 10, options)}
      {suffix}
    </span>
  );
}
