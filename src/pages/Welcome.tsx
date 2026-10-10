import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useI18n } from '@/i18n';
import { BrandMark, IconChart, IconCheck, IconSparkle, IconTarget, IconUsers, IconWallet, IconCalendarCheck } from '@/components/icons';
import { Chip, Segmented } from '@/components/ui';
import { homePath } from '@/app/nav';
import { nameOf } from '@/lib/names';
import { useAppData } from '@/store/hooks';
import { useSettings } from '@/store/settings';
import type { Mode } from '@/types';

const EASE = [0.23, 1, 0.32, 1] as const;

/** First screen: pick a role to try. This is a demo choice, not a login. */
export function Welcome() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const data = useAppData();
  const { setLang, patchSettings, lang: current } = useSettings();
  const rafi = data.students[0];

  const choose = (mode: Mode) => {
    patchSettings({ welcomed: true, mode, lockedRole: mode === 'student' ? 'student' : undefined, activeStudentId: rafi?.id });
    navigate(homePath(mode), { replace: true });
  };

  const cards: { mode: Mode; initial: string; title: string; who: string; sub: string; bullets: { icon: typeof IconChart; text: string }[]; cta: string }[] = [
    {
      mode: 'teacher',
      initial: data.profile.teacherName[lang],
      title: t('welcome.teacher'),
      who: data.profile.teacherName[lang],
      sub: data.profile.centerName[lang],
      bullets: [
        { icon: IconCalendarCheck, text: t('welcome.t1') },
        { icon: IconChart, text: t('welcome.t2') },
        { icon: IconWallet, text: t('welcome.t3') },
      ],
      cta: t('welcome.continueTeacher'),
    },
    {
      mode: 'student',
      initial: rafi ? nameOf(rafi, lang) : '?',
      title: t('welcome.student'),
      who: rafi ? nameOf(rafi, lang) : '–',
      sub: rafi?.className ?? '',
      bullets: [
        { icon: IconSparkle, text: t('welcome.s1') },
        { icon: IconTarget, text: t('welcome.s2') },
        { icon: IconUsers, text: t('welcome.s3') },
      ],
      cta: t('welcome.continueStudent'),
    },
  ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col justify-center gap-8 py-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BrandMark size={44} />
          <div>
            <p className="font-display text-xl leading-tight font-semibold tracking-[-0.02em]">{t('app.name')}</p>
            <p className="text-xs text-muted">{t('app.tagline')}</p>
          </div>
        </div>
        <Segmented label={t('topbar.language')} value={current} onChange={setLang} options={[{ value: 'en', label: 'EN', ariaLabel: 'English' }, { value: 'bn', label: 'বাং', ariaLabel: 'বাংলা' }]} />
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="space-y-2">
        <Chip tone="gold">{t('common.demoVersion')}</Chip>
        <h1 className="font-display text-gradient text-3xl leading-tight font-semibold tracking-[-0.025em] sm:text-5xl">{t('welcome.title')}</h1>
        <p className="max-w-xl text-muted">{t('welcome.pick')}</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
        {cards.map((c, i) => (
          <motion.button
            key={c.mode}
            type="button"
            onClick={() => choose(c.mode)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.1 + i * 0.08 }}
            className="glass press group cursor-pointer space-y-5 rounded-[1.75rem] p-5 text-left sm:p-6"
          >
            <div className="flex items-center gap-4">
              <span className="font-display flex size-14 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#8a6dff] to-[#3a1fa0] text-xl font-semibold text-white ring-2 ring-[color:var(--gold-line)]">{c.initial.charAt(0)}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">{c.title}</p>
                <p className="font-display truncate text-xl font-semibold tracking-[-0.02em]">{c.who}</p>
                <p className="truncate text-sm text-muted">{c.sub}</p>
              </div>
            </div>
            <ul className="space-y-2">
              {c.bullets.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-sm">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-text"><Icon width={16} height={16} /></span>
                  {text}
                </li>
              ))}
            </ul>
            <span className="btn-primary inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold">
              <IconCheck width={16} height={16} /> {c.cta}
            </span>
          </motion.button>
        ))}
      </div>

      <p className="text-xs text-muted">{t('welcome.note')}</p>
    </div>
  );
}
