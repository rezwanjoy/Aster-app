import { useI18n } from '@/i18n';
import { IconBell, IconCheck, IconCloud, IconLayers, IconSparkle } from '@/components/icons';
import { cx } from '@/components/ui';
import type { PremiumId } from '@/data/premium';

/** Small illustrated mock-ups. They show roughly what the feature would look like. Nothing here works. */
export function PremiumPreview({ id }: { id: PremiumId }) {
  const { t } = useI18n();
  const frame = 'relative overflow-hidden rounded-2xl border border-line bg-surface-2 p-3';
  const bar = (w: string, tone = 'bg-line-strong') => <span className={cx('block h-2 rounded-full', tone)} style={{ width: w }} />;

  let body: React.ReactNode = null;
  if (id === 'recorder') {
    body = (
      <div className="space-y-2.5">
        <div className="flex h-10 items-end gap-1" aria-hidden="true">
          {[40, 70, 35, 90, 55, 80, 30, 65, 95, 45, 75, 50, 85, 40, 60].map((h, i) => (
            <span key={i} className="block w-1.5 rounded-full bg-[#8f78ff]" style={{ height: `${h}%` }} />
          ))}
        </div>
        <p className="text-xs italic text-muted">“{t('premium.sample.recorder')}”</p>
        {bar('90%')}
        {bar('70%')}
      </div>
    );
  } else if (id === 'practice') {
    body = (
      <div className="space-y-2">
        <p className="text-sm font-semibold">{t('premium.sample.question')}</p>
        {['x = 2, 3', 'x = 1, 6', 'x = −2, −3'].map((o, i) => (
          <span key={o} className={cx('block rounded-xl border px-3 py-1.5 text-xs', i === 0 ? 'border-green-fg text-green-fg' : 'border-line text-muted')}>
            {String.fromCharCode(65 + i)}. {o}
          </span>
        ))}
      </div>
    );
  } else if (id === 'alerts') {
    body = (
      <ul className="space-y-2">
        {[t('premium.sample.alert1'), t('premium.sample.alert2')].map((a) => (
          <li key={a} className="flex items-center gap-2 text-xs"><IconBell width={14} height={14} className="text-gold" />{a}</li>
        ))}
      </ul>
    );
  } else if (id === 'pdf') {
    body = (
      <div className="mx-auto w-40 space-y-2 rounded-lg bg-white p-3 text-[#14102b] shadow-card">
        <span className="block h-4 rounded bg-linear-to-r from-[#6d4cf0] to-[#3a1fa0]" />
        <span className="block h-1.5 w-3/4 rounded-full bg-[#d6d1ee]" />
        <span className="block h-1.5 rounded-full bg-[#e6e2f5]" />
        <span className="block h-1.5 w-5/6 rounded-full bg-[#e6e2f5]" />
        <span className="block h-1.5 w-2/3 rounded-full bg-[#e6e2f5]" />
      </div>
    );
  } else if (id === 'paper') {
    body = (
      <ul className="space-y-1.5 text-xs">
        {[t('premium.sample.paper1'), t('premium.sample.paper2'), t('premium.sample.paper3')].map((x, i) => (
          <li key={x} className="flex items-center gap-2"><IconCheck width={14} height={14} className={i < 2 ? 'text-green-fg' : 'text-muted'} />{x}</li>
        ))}
      </ul>
    );
  } else if (id === 'center') {
    body = (
      <div className="flex h-16 items-end gap-3" aria-hidden="true">
        {[65, 80, 55].map((h, i) => <span key={i} className="block flex-1 rounded-t-lg bg-linear-to-t from-[#4a2cc0] to-[#a595ff]" style={{ height: `${h}%` }} />)}
        <IconLayers width={22} height={22} className="mb-1 text-gold" />
      </div>
    );
  } else if (id === 'teacherAi') {
    body = (
      <ul className="space-y-2 text-xs">
        {[t('premium.sample.teacher1'), t('premium.sample.teacher2')].map((a) => (
          <li key={a} className="flex items-start gap-2"><IconSparkle width={14} height={14} className="mt-0.5 shrink-0 text-gold" />{a}</li>
        ))}
      </ul>
    );
  } else if (id === 'school') {
    body = (
      <div className="space-y-2 text-xs">
        {['Class 9 · Section A', 'Class 9 · Section B', 'Class 10 · Section A'].map((c, i) => (
          <div key={c} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-1.5">
            <span className="font-medium">{c}</span>
            <span className="flex items-center gap-1.5 text-muted">{['3 teachers', '2 teachers', '4 teachers'][i]}<IconLayers width={14} height={14} className="text-gold" /></span>
          </div>
        ))}
      </div>
    );
  } else if (id === 'sync') {
    body = (
      <div className="flex items-center justify-center gap-3 text-xs text-muted">
        <span className="rounded-lg border border-line px-3 py-2">{t('premium.sample.phone')}</span>
        <IconCloud width={22} height={22} className="text-gold" />
        <span className="rounded-lg border border-line px-3 py-2">{t('premium.sample.pc')}</span>
        <span className="flex items-center gap-1 text-green-fg"><IconCheck width={14} height={14} />{t('premium.sample.synced')}</span>
      </div>
    );
  } else {
    body = <p className="text-xs text-muted">{t('premium.sample.plan')}</p>;
  }

  return (
    <figure className={frame} aria-label={t('premium.sampleLabel')}>
      <figcaption className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">{t('premium.sampleLabel')}</figcaption>
      {body}
    </figure>
  );
}
