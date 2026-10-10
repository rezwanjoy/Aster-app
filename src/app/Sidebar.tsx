import { Link, NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { useI18n } from '@/i18n';
import { useSettings } from '@/store/settings';
import { BrandMark, IconUser } from '@/components/icons';
import { Chip, UI_SPRING, cx } from '@/components/ui';
import { nameOf } from '@/lib/names';
import { useActiveStudent } from '@/store/hooks';
import { NAV, homePath } from './nav';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cx(
    'press group relative flex min-h-12 items-center gap-3 rounded-2xl px-3.5 text-sm font-medium',
    isActive ? 'text-fg' : 'text-muted hover:text-fg',
  );

function ActivePill({ id }: { id: string }) {
  return (
    <motion.span
      layoutId={id}
      transition={UI_SPRING}
      className="absolute inset-0 rounded-2xl border border-line-strong bg-brand-soft shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]"
    >
      <span className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[linear-gradient(#e3c98f,#c9a45a)] shadow-[0_0_12px_#e3c98f]" />
    </motion.span>
  );
}

/** PC (≥1024px) floating glass side menu. */
export function Sidebar() {
  const { t, lang } = useI18n();
  const mode = useSettings((s) => s.mode);
  const { data, student } = useActiveStudent();
  const persona = mode !== 'student' ? data.profile.teacherName[lang] : student ? nameOf(student, lang) : '';
  const subtitle = mode !== 'student' ? data.profile.centerName[lang] : student?.className ?? '';

  return (
    <aside className="glass-blur fixed top-4 bottom-4 left-4 z-30 hidden w-[calc(var(--side-w)-1.5rem)] flex-col gap-6 rounded-[2rem] px-3 py-5 shadow-card lg:flex">
      <Link to={mode !== 'student' ? '/home' : homePath(mode)} aria-label={mode !== 'student' ? `${t('app.name')}: ${t('profile.homePage')}` : t('app.name')} className="press flex items-center gap-3 rounded-2xl px-2 py-1">
        <BrandMark size={40} />
        <div className="min-w-0">
          <p className="font-display text-lg leading-tight font-semibold tracking-[-0.02em]">{t('app.name')}</p>
          <p className="truncate text-xs text-muted">{t('app.tagline')}</p>
        </div>
      </Link>

      <nav aria-label={t('nav.label')} className="flex flex-1 flex-col gap-1">
        {NAV[mode].map(({ path, labelKey, Icon }) => (
          <NavLink key={`${mode}-${path}`} to={`/${mode}/${path}`} className={linkClass}>
            {({ isActive }) => (
              <>
                {isActive && <ActivePill id="side-active" />}
                <Icon className={cx('relative size-[22px] transition-colors', isActive && 'text-brand-text')} />
                <span className="relative">{t(labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2">
        <NavLink to="/profile" className={linkClass}>
          {({ isActive }) => (
            <>
              {isActive && <ActivePill id="side-active" />}
              <IconUser className={cx('relative size-[22px]', isActive && 'text-brand-text')} />
              <span className="relative">{t('nav.settings')}</span>
            </>
          )}
        </NavLink>

        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3">
          <span className="font-display flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#8a6dff] to-[#3a1fa0] text-sm font-semibold text-white ring-2 ring-[color:var(--gold-line)]">
            {persona.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{persona}</p>
            <p className="truncate text-xs text-muted">{subtitle}</p>
          </div>
        </div>
        <div className="px-1">
          <Chip tone="gold">{t('common.demoVersion')}</Chip>
        </div>
      </div>
    </aside>
  );
}
