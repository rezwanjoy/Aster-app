import { useRegisterSW } from 'virtual:pwa-register/react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui';

/** "Update available" + "ready offline" toasts, driven by the service worker. */
export function UpdatePrompt() {
  const { t } = useI18n();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh && !offlineReady) return null;

  const close = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="rise-in fixed inset-x-4 bottom-28 z-50 mx-auto max-w-sm rounded-2xl border border-line-strong bg-surface p-4 shadow-card lg:inset-x-auto lg:right-6 lg:bottom-6 lg:mx-0"
    >
      <p className="font-semibold">{needRefresh ? t('pwa.updateTitle') : t('pwa.offlineTitle')}</p>
      <p className="mt-1 text-sm text-muted">{needRefresh ? t('pwa.updateBody') : t('pwa.offlineBody')}</p>
      <div className="mt-3 flex gap-2">
        {needRefresh && <Button onClick={() => updateServiceWorker(true)}>{t('pwa.reload')}</Button>}
        <Button variant="secondary" onClick={close}>
          {needRefresh ? t('pwa.later') : t('pwa.dismiss')}
        </Button>
      </div>
    </div>
  );
}
