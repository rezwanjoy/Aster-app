import { motion } from 'motion/react';
import { useI18n, type TKey } from '@/i18n';
import { Button, Card, Chip, cx } from '@/components/ui';
import { IconCheck } from '@/components/icons';
import { ITEM_KEYS, TIERS, type TierId } from '@/data/tiers';

const EASE = [0.23, 1, 0.32, 1] as const;

/** Solo / Plus / Pro cards. Used on the home page and the Plans page; `onChoose` decides what the button does. */
export function PricingCards({ onChoose, cta }: { onChoose: (id: TierId) => void; cta: (id: TierId) => string }) {
  const { t, n } = useI18n();
  const k = (id: TierId, s: string) => t(`tiers.${id}.${s}` as TKey);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
      {TIERS.map((tier, i) => {
        const hi = !!tier.popular;
        return (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, ease: EASE, delay: i * 0.08 }}
          >
            <Card hero={hi} className="flex h-full flex-col gap-5 p-5 sm:p-6">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-xl font-semibold tracking-[-0.02em]">{k(tier.id, 'name')}</h3>
                  {tier.popular && <Chip tone="gold">{t('tiers.popular')}</Chip>}
                  {tier.soon && <Chip tone="gold">{t('plans.soon')}</Chip>}
                </div>
                <p className={cx('text-sm', hi ? 'text-white/80' : 'text-muted')}>{k(tier.id, 'for')}</p>
                <p className="font-display pt-1 text-4xl font-semibold tracking-[-0.03em]">
                  {tier.price === 0 ? t('tiers.free') : `৳${n(tier.price)}`}
                  {tier.price > 0 && <span className={cx('ms-1 text-sm font-normal', hi ? 'text-white/70' : 'text-muted')}>{t('premium.perMonth')}</span>}
                </p>
                <p className={cx('text-sm font-medium', hi ? 'text-[#f1e2bd]' : 'text-gold')}>
                  {t(tier.over ? 'tiers.over' : 'tiers.upTo', { max: n(tier.limit) })}
                </p>
              </div>
              <ul className="flex-1 space-y-2.5 text-sm">
                {ITEM_KEYS.map((key) => (
                  <li key={key} className="flex items-start gap-2">
                    <IconCheck width={16} height={16} className={cx('mt-0.5 shrink-0', hi ? 'text-[#f1e2bd]' : 'text-gold')} />
                    {k(tier.id, key)}
                  </li>
                ))}
              </ul>
              <Button variant={hi ? 'secondary' : 'primary'} className={hi ? 'text-fg' : undefined} onClick={() => onChoose(tier.id)}>
                {cta(tier.id)}
              </Button>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
