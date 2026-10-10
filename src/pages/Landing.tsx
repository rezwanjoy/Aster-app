import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useI18n, type TKey } from '@/i18n';
import { BrandMark, IconCalendarCheck, IconChart, IconCheck, IconCloud, IconLock, IconMonitor, IconMoon, IconPencil, IconSparkle, IconSun, IconTarget, IconUser, IconUsers } from '@/components/icons';
import { Chip, IconButton, Segmented } from '@/components/ui';
import { Ring } from '@/components/charts';
import { PricingCards } from '@/features/landing/PricingCards';
import { homePath } from '@/app/nav';
import { useSettings, type Theme } from '@/store/settings';

const EASE = [0.23, 1, 0.32, 1] as const;
const nextTheme: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' };
const themeIcon = { light: IconSun, dark: IconMoon, system: IconMonitor };

const rise = (i = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.5, ease: EASE, delay: i * 0.07 },
});

/** A small, static picture of the Insights screen (numbers match the sample data). */
function HeroPreview() {
  const { t, n } = useI18n();
  const bars = [
    { name: 'Quadratic Equations', v: 58, tone: 'from-[#ef6b6b] to-[#b91c1c]' },
    { name: 'Trigonometry', v: 25, tone: 'from-[#f2c14e] to-[#b7791f]' },
    { name: 'Force', v: 20, tone: 'from-[#f2c14e] to-[#b7791f]' },
  ];
  return (
    <div className="glass relative mx-auto w-full max-w-md space-y-4 rounded-[1.75rem] p-5" aria-hidden="true">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">{t('landing.preview.title')}</p>
          <p className="font-display text-lg font-semibold tracking-[-0.015em]">{t('landing.preview.sub')}</p>
        </div>
        <Ring value={72} size={72} stroke={8} label={`${n(72)}%`} sub={t('common.mastery')} />
      </div>
      <ul className="space-y-3">
        {bars.map((b, i) => (
          <li key={b.name} className="space-y-1">
            <div className="flex justify-between text-xs"><span className="font-medium">{b.name}</span><span className="num text-muted">{n(b.v)}%</span></div>
            <div className="h-2 rounded-full bg-surface-2">
              <motion.div className={`h-full origin-left rounded-full bg-linear-to-r ${b.tone}`} style={{ width: `${b.v}%` }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, ease: EASE, delay: 0.4 + i * 0.1 }} />
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 px-3 py-2 text-xs">
        <IconSparkle width={14} height={14} className="text-gold" />
        {t('landing.preview.tip')}
      </div>
    </div>
  );
}

const FAQ: TKey[] = ['landing.faq.q1', 'landing.faq.q2', 'landing.faq.q3', 'landing.faq.q4', 'landing.faq.q5'];

/** The first page a new visitor sees: what Aster is, who it is for, what it costs. */
export function Landing() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { lang, setLang, theme, setTheme, welcomed, mode } = useSettings();
  const ThemeIcon = themeIcon[theme];

  const entries = [
    { role: 'teacher', icon: IconUser, title: t('landing.entry.teacher'), body: t('landing.entry.teacherBody') },
    { role: 'center', icon: IconUsers, title: t('landing.entry.center'), body: t('landing.entry.centerBody') },
    { role: 'student', icon: IconTarget, title: t('landing.entry.student'), body: t('landing.entry.studentBody') },
  ];
  const steps = [
    { icon: IconPencil, title: t('landing.how.s1'), body: t('landing.how.s1b') },
    { icon: IconChart, title: t('landing.how.s2'), body: t('landing.how.s2b') },
    { icon: IconCalendarCheck, title: t('landing.how.s3'), body: t('landing.how.s3b') },
  ];
  const why = [
    { icon: IconCloud, title: t('landing.why.w1'), body: t('landing.why.w1b') },
    { icon: IconSparkle, title: t('landing.why.w2'), body: t('landing.why.w2b') },
    { icon: IconLock, title: t('landing.why.w3'), body: t('landing.why.w3b') },
    { icon: IconCheck, title: t('landing.why.w4'), body: t('landing.why.w4b') },
  ];

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <header className="sticky top-0 z-20 pt-3">
        <div className="glass-blur flex items-center gap-2 rounded-[1.75rem] px-3 py-2 shadow-card">
          <Link to="/home" className="mr-auto flex min-h-11 items-center gap-2 pl-1">
            <BrandMark size={32} />
            <span className="font-display text-lg font-semibold tracking-[-0.02em]">{t('app.name')}</span>
          </Link>
          <nav aria-label={t('landing.navLabel')} className="hidden items-center gap-1 sm:flex">
            <a href="#about" className="press inline-flex min-h-11 items-center rounded-2xl px-3 text-sm font-medium text-muted hover:text-fg">{t('landing.nav.about')}</a>
            <a href="#how" className="press inline-flex min-h-11 items-center rounded-2xl px-3 text-sm font-medium text-muted hover:text-fg">{t('landing.nav.how')}</a>
            <a href="#faq" className="press inline-flex min-h-11 items-center rounded-2xl px-3 text-sm font-medium text-muted hover:text-fg">{t('landing.nav.faq')}</a>
            <a href="#pricing" className="press inline-flex min-h-11 items-center rounded-2xl px-3 text-sm font-medium text-muted hover:text-fg">{t('landing.nav.pricing')}</a>
          </nav>
          <Segmented label={t('topbar.language')} value={lang} onChange={setLang} options={[{ value: 'en', label: 'EN', ariaLabel: 'English' }, { value: 'bn', label: 'বাং', ariaLabel: 'বাংলা' }]} />
          <IconButton label={`${t('topbar.theme')}: ${t(`theme.${theme}`)}`} onClick={() => setTheme(nextTheme[theme])}>
            <ThemeIcon width={22} height={22} />
          </IconButton>
          <Link to={welcomed ? homePath(mode) : '/signin/teacher'} className={`btn-primary press min-h-11 items-center rounded-2xl px-4 text-sm font-semibold sm:px-5 ${welcomed ? 'inline-flex' : 'hidden sm:inline-flex'}`}>
            {welcomed ? t('landing.openApp') : t('landing.signIn')}
          </Link>
        </div>
      </header>

      <section className="grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="space-y-4">
            <Chip tone="gold">{t('common.demoVersion')}</Chip>
            <h1 className="font-display text-gradient text-4xl leading-[1.05] font-semibold tracking-[-0.03em] sm:text-6xl">{t('app.tagline')}</h1>
            <p className="max-w-xl text-base text-muted sm:text-lg">{t('landing.sub')}</p>
          </motion.div>
          <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {entries.map((e, i) => (
              <motion.li key={e.role} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: 0.1 + i * 0.07 }}>
                <Link to={`/signin/${e.role}`} className="glass press group flex h-full min-h-11 items-center gap-3 rounded-[1.5rem] p-4 sm:flex-col sm:items-start lg:flex-row lg:items-center xl:flex-col xl:items-start">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text"><e.icon width={20} height={20} /></span>
                  <span className="min-w-0">
                    <span className="font-display block text-base font-semibold tracking-[-0.015em]">{e.title}</span>
                    <span className="block text-xs text-muted">{e.body}</span>
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
            {[t('landing.trust.t1'), t('landing.trust.t2'), t('landing.trust.t3')].map((x) => (
              <span key={x} className="flex items-center gap-1.5"><IconCheck width={14} height={14} className="text-gold" />{x}</span>
            ))}
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}>
          <HeroPreview />
        </motion.div>
      </section>

      <section id="about" className="scroll-mt-24 space-y-6 py-10">
        <motion.div {...rise()} className="max-w-3xl space-y-3">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.025em] sm:text-4xl">{t('landing.about.title')}</h2>
          <p className="text-base text-muted sm:text-lg">{t('landing.about.body')}</p>
        </motion.div>
        <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
          {(['teachers', 'students'] as const).map((who, i) => (
            <motion.div key={who} {...rise(i)} className="glass space-y-3 rounded-[1.75rem] p-5 sm:p-6">
              <h3 className="font-display text-lg font-semibold tracking-[-0.015em]">{t(`landing.about.${who}.title` as TKey)}</h3>
              <ul className="space-y-2 text-sm">
                {(['b1', 'b2', 'b3'] as const).map((b) => (
                  <li key={b} className="flex items-start gap-2"><IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-gold" />{t(`landing.about.${who}.${b}` as TKey)}</li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
        <motion.div {...rise(2)} className="flex items-start gap-3 rounded-[1.5rem] border border-[color:var(--gold-line)] bg-gold-soft p-5">
          <IconSparkle width={22} height={22} className="mt-0.5 shrink-0 text-gold" />
          <div>
            <h3 className="font-display text-base font-semibold tracking-[-0.015em]">{t('landing.about.aiTitle')}</h3>
            <p className="mt-1 text-sm text-muted">{t('landing.about.ai')}</p>
          </div>
        </motion.div>
      </section>

      <section id="how" className="scroll-mt-24 space-y-6 py-10">
        <motion.div {...rise()} className="space-y-1">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.025em] sm:text-4xl">{t('landing.how.title')}</h2>
        </motion.div>
        <ol className="grid gap-4 md:grid-cols-3 lg:gap-6">
          {steps.map((s, i) => (
            <motion.li key={s.title} {...rise(i)} className="glass space-y-3 rounded-[1.75rem] p-5">
              <div className="flex items-center gap-3">
                <span className="font-display flex size-9 items-center justify-center rounded-full bg-linear-to-br from-[#8a6dff] to-[#3a1fa0] text-sm font-semibold text-white ring-2 ring-[color:var(--gold-line)]">{i + 1}</span>
                <s.icon width={22} height={22} className="text-gold" />
              </div>
              <h3 className="font-display text-lg font-semibold tracking-[-0.015em]">{s.title}</h3>
              <p className="text-sm text-muted">{s.body}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="space-y-6 py-10">
        <motion.h2 {...rise()} className="font-display text-2xl font-semibold tracking-[-0.025em] sm:text-4xl">{t('landing.why.title')}</motion.h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {why.map((w, i) => (
            <motion.li key={w.title} {...rise(i)} className="space-y-2 rounded-[1.5rem] border border-line bg-surface-2/60 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-gold-soft text-gold"><w.icon width={20} height={20} /></span>
              <h3 className="font-display text-base font-semibold tracking-[-0.015em]">{w.title}</h3>
              <p className="text-sm text-muted">{w.body}</p>
            </motion.li>
          ))}
        </ul>
      </section>

      <section id="faq" className="scroll-mt-24 space-y-6 py-10">
        <motion.h2 {...rise()} className="font-display text-2xl font-semibold tracking-[-0.025em] sm:text-4xl">{t('landing.faq.title')}</motion.h2>
        <div className="mx-auto max-w-3xl space-y-3">
          {FAQ.map((q) => (
            <details key={q} className="glass group rounded-[1.5rem] px-5 py-1">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2 font-semibold [&::-webkit-details-marker]:hidden">
                {t(q)}
                <span aria-hidden="true" className="text-gold transition-transform duration-300 group-open:rotate-45">+</span>
              </summary>
              <p className="pb-4 text-sm text-muted">{t(`${q}a` as TKey)}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="pricing" className="scroll-mt-24 space-y-6 py-10">
        <motion.div {...rise()} className="space-y-1">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.025em] sm:text-4xl">{t('landing.pricing.title')}</h2>
          <p className="max-w-2xl text-muted">{t('landing.pricing.sub')}</p>
        </motion.div>
        <PricingCards onChoose={(id) => navigate(id === 'pro' ? '/signin/center' : id === 'plus' ? '/signin/center' : '/signin/teacher')} cta={(id) => t(`tiers.${id}.cta` as TKey)} />
        <p className="text-xs text-muted">{t('landing.pricing.note')}</p>
      </section>

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-sm text-muted">
        <div className="flex items-center gap-2"><BrandMark size={24} /><span className="font-display font-semibold text-fg">{t('app.name')}</span><Chip tone="gold">{t('common.demoVersion')}</Chip></div>
        <p>{t('landing.footer')}</p>
        <Link to="/signin/teacher" className="inline-flex min-h-11 items-center font-semibold text-brand-text hover:underline">{t('landing.signIn')}</Link>
      </footer>
    </div>
  );
}
