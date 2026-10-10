import { useMemo, useState } from 'react';
import { useI18n, type TKey } from '@/i18n';
import { Button, Card } from '@/components/ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { parsePriceKey, type PremiumId } from '@/data/premium';
import { clearInterest, interestToCsv, interestToJson, summarizeInterest } from '@/lib/interest';
import { todayISO } from '@/lib/dates';
import { useData } from '@/store/data';
import { useAppData } from '@/store/hooks';

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}

/** What was tapped on this device, with export so the founder can collect results from each tutor. */
export function FeedbackCard() {
  const { t, n } = useI18n();
  const { interest } = useAppData();
  const [clearing, setClearing] = useState(false);
  const rows = useMemo(() => summarizeInterest(interest), [interest]);
  const title = (feature: string) => t(`premium.f.${feature as PremiumId}.title` as TKey);
  const priceText = (prices: Record<string, number>) =>
    Object.entries(prices)
      .map(([key, count]) => {
        const p = parsePriceKey(key);
        return `${p ? (p.amount === 'none' ? t('premium.none') : `৳${n(p.amount)}`) : key} ×${n(count)}`;
      })
      .join(', ');

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-[-0.015em]">{t('feedback.title')}</h2>
        <p className="mt-1 text-sm text-muted">{t('feedback.desc')}</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">{t('feedback.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th scope="col" className="px-3 py-2 font-medium">{t('feedback.feature')}</th>
                <th scope="col" className="px-3 py-2 text-center font-medium">{t('feedback.views')}</th>
                <th scope="col" className="px-3 py-2 text-center font-medium">{t('feedback.notify')}</th>
                <th scope="col" className="px-3 py-2 text-center font-medium">{t('feedback.wouldPay')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.feature} className="border-b border-line/60 last:border-0 align-top">
                  <th scope="row" className="px-3 py-2 text-left font-medium">
                    {title(r.feature)}
                    {Object.keys(r.prices).length > 0 && <span className="mt-0.5 block text-xs font-normal text-muted">{t('feedback.prices', { list: priceText(r.prices) })}</span>}
                  </th>
                  <td className="num px-3 py-2 text-center">{n(r.views)}</td>
                  <td className="num px-3 py-2 text-center">{n(r.notify)}</td>
                  <td className="num px-3 py-2 text-center font-semibold">{n(r.wouldPay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button disabled={interest.length === 0} onClick={() => download(`aster-feedback-${todayISO()}.json`, interestToJson(interest), 'application/json')}>{t('feedback.exportJson')}</Button>
        <Button variant="secondary" disabled={interest.length === 0} onClick={() => download(`aster-feedback-${todayISO()}.csv`, interestToCsv(interest), 'text/csv')}>{t('feedback.exportCsv')}</Button>
        <Button variant="secondary" className="text-red-fg" disabled={interest.length === 0} onClick={() => setClearing(true)}>{t('feedback.clear')}</Button>
      </div>

      <ConfirmDialog open={clearing} title={t('feedback.clearTitle')} confirmLabel={t('feedback.clear')} onClose={() => setClearing(false)} onConfirm={() => useData.getState().apply(clearInterest)}>
        {t('feedback.clearBody')}
      </ConfirmDialog>
    </Card>
  );
}
