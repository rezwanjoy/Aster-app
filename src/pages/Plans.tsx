import { useState } from 'react';
import { useI18n, type TKey } from '@/i18n';
import { PageHeader } from '@/components/PageHeader';
import { Reveal } from '@/components/motion';
import { PricingCards } from '@/features/landing/PricingCards';
import { PremiumSheet } from '@/features/premium/PremiumSheet';
import type { PremiumId } from '@/data/premium';
import type { TierId } from '@/data/tiers';

/** Solo / Plus / Pro, marked as PLANNED pricing. Nothing can be bought (brief §11, §19, §23b). */
export function Plans() {
  const { t } = useI18n();
  const [open, setOpen] = useState<PremiumId | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('plans.eyebrow')} title={t('plans.title')} desc={t('plans.desc')} demo={false} />
      <Reveal i={1}>
        <PricingCards
          onChoose={(id: TierId) => id !== 'solo' && setOpen(id === 'plus' ? 'planCenter' : 'school')}
          cta={(id) => t(`tiers.${id}.ask` as TKey)}
        />
      </Reveal>
      <p className="text-sm text-muted">{t('plans.freeNote')}</p>
      <p className="text-sm text-muted">{t('plans.annual')}</p>
      <p className="text-xs text-muted">{t('plans.note')}</p>
      {open && <PremiumSheet id={open} open onClose={() => setOpen(null)} />}
    </div>
  );
}
