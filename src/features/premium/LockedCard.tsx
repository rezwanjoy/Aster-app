import { useState } from 'react';
import { useI18n, type TKey } from '@/i18n';
import { Chip, cx } from '@/components/ui';
import { IconChevronRight, IconLock } from '@/components/icons';
import { featureById, type PremiumId } from '@/data/premium';
import { PremiumSheet } from './PremiumSheet';

/** A premium feature shown locked, in the place where it would be useful. Tapping opens the fake-door sheet. */
export function LockedCard({ id, className }: { id: PremiumId; className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const Icon = featureById(id).Icon;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cx(
          'glass press group flex w-full cursor-pointer items-center gap-3 rounded-[1.75rem] border-dashed p-4 text-left sm:p-5',
          className,
        )}
      >
        <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gold-soft text-gold">
          <Icon width={22} height={22} />
          <IconLock width={12} height={12} className="absolute -right-1 -bottom-1 rounded-full bg-surface p-0.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm font-semibold sm:text-base">{t(`premium.f.${id}.title` as TKey)}</span>
            <Chip tone="gold">{t('premium.badge')}</Chip>
          </span>
          <span className="mt-0.5 block text-xs text-muted sm:text-sm">{t(`premium.f.${id}.benefit` as TKey)}</span>
        </span>
        <IconChevronRight width={18} height={18} className="shrink-0 text-muted transition-transform duration-300 group-hover:translate-x-1" />
      </button>
      <PremiumSheet id={id} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
