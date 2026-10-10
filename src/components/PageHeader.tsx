import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Chip } from './ui';
import { useI18n } from '@/i18n';

/** Screen title block: gold eyebrow, gradient display title, subtitle, optional right slot. */
export function PageHeader({
  eyebrow,
  title,
  desc,
  aside,
  demo = true,
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
  aside?: ReactNode;
  /** show the "Sample data" tag (off for screens that are not about the sample school) */
  demo?: boolean;
}) {
  const { t } = useI18n();
  return (
    <motion.header
      className="flex flex-wrap items-end justify-between gap-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {eyebrow && <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">{eyebrow}</p>}
          {demo && <Chip tone="gold">{t('common.demoData')}</Chip>}
        </div>
        <h1 className="font-display text-gradient mt-1.5 text-[1.75rem] leading-tight font-semibold tracking-[-0.025em] sm:text-4xl">
          {title}
        </h1>
        {desc && <p className="mt-1.5 max-w-prose text-sm text-muted sm:text-base">{desc}</p>}
      </div>
      {aside}
    </motion.header>
  );
}
