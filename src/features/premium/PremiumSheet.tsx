import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n, type TKey } from '@/i18n';
import { Button, Chip, cx } from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { ToggleChip } from '@/components/forms';
import { IconCheck, IconLock } from '@/components/icons';
import { featureById, PRICE_POINTS, priceKey, type PremiumId } from '@/data/premium';
import { recordInterest } from '@/lib/interest';
import { useData } from '@/store/data';
import { PremiumPreview } from './PremiumPreview';

/**
 * Fake door: describes a feature that is NOT built yet and records whether the tutor wants it
 * and what they would pay. No payment details are ever asked for.
 */
export function PremiumSheet({ id, open, onClose }: { id: PremiumId; open: boolean; onClose: () => void }) {
  return open ? <Inner id={id} onClose={onClose} /> : null;
}

function Inner({ id, onClose }: { id: PremiumId; onClose: () => void }) {
  const { t, n } = useI18n();
  const feature = featureById(id);
  const Icon = feature.Icon;
  const [notified, setNotified] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [price, setPrice] = useState<number | 'none' | null>(null);
  const [sent, setSent] = useState(false);
  const logged = useRef(false);
  const log = (type: 'view' | 'tap_unlock' | 'would_pay', priceChoice?: string) =>
    useData.getState().apply((d) => recordInterest(d, { feature: id, type, priceChoice }));

  // one "view" per opening
  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    log('view');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const k = (suffix: string) => `premium.f.${id}.${suffix}` as TKey;

  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      title={t(k('title'))}
      footer={
        <>
          <Link to="/plans" onClick={onClose} className="press mr-auto inline-flex min-h-11 items-center text-sm font-semibold text-brand-text hover:underline">{t('premium.seePlans')}</Link>
          <Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gold-soft text-gold"><Icon width={24} height={24} /></span>
          <div className="min-w-0">
            <Chip tone="gold"><IconLock width={12} height={12} />{t('premium.badge')}</Chip>
            <p className="mt-1.5 text-sm">{t(k('benefit'))}</p>
          </div>
        </div>

        <PremiumPreview id={id} />

        <ul className="space-y-1.5 text-sm">
          {(['b1', 'b2', 'b3'] as const).map((b) => (
            <li key={b} className="flex items-start gap-2"><IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-gold" />{t(k(b))}</li>
          ))}
        </ul>

        <p className="rounded-2xl border border-[color:var(--gold-line)] bg-gold-soft p-3 text-xs">{t('premium.comingSoon')}</p>

        {sent ? (
          <p role="status" className="rounded-2xl border border-line bg-surface-2 p-3 text-sm font-medium text-green-fg">{t('premium.thanks')}</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={notified}
                onClick={() => {
                  log('tap_unlock');
                  setNotified(true);
                }}
              >
                {notified ? t('premium.notified') : t('premium.notify')}
              </Button>
              <Button onClick={() => setChoosing(true)} disabled={choosing}>{t('premium.wouldPay')}</Button>
            </div>
            {notified && <p role="status" className="text-sm text-green-fg">{t('premium.notifiedNote')}</p>}

            {choosing && (
              <fieldset className="space-y-3 rounded-2xl border border-line bg-surface-2 p-3">
                <legend className="px-1 text-sm font-medium">{t('premium.priceTitle')}</legend>
                <div className="flex flex-wrap gap-2">
                  {PRICE_POINTS[feature.plan].map((p) => (
                    <ToggleChip key={p} on={price === p} onClick={() => setPrice(p)}>৳{n(p)} {t('premium.perMonth')}</ToggleChip>
                  ))}
                  <ToggleChip on={price === 'none'} onClick={() => setPrice('none')}>{t('premium.none')}</ToggleChip>
                </div>
                <Button
                  disabled={price === null}
                  className={cx(price === null && 'opacity-60')}
                  onClick={() => {
                    if (price === null) return;
                    log('would_pay', priceKey(feature.plan, price));
                    setSent(true);
                  }}
                >
                  {t('premium.send')}
                </Button>
              </fieldset>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
