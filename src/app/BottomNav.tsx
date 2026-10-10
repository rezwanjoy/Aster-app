import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { useI18n } from '@/i18n';
import { useSettings } from '@/store/settings';
import { UI_SPRING, cx } from '@/components/ui';
import { NAV } from './nav';

/** Phone / tablet (<1024px): floating glass bar with a sliding glow indicator. */
export function BottomNav() {
  const { t } = useI18n();
  const mode = useSettings((s) => s.mode);

  return (
    <nav
      aria-label={t('nav.label')}
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md lg:hidden"
    >
      <ul className="glass-blur flex rounded-[1.75rem] p-1.5 shadow-card">
        {NAV[mode].map(({ path, labelKey, Icon }) => (
          <li key={`${mode}-${path}`} className="min-w-0 flex-1">
            <NavLink
              to={`/${mode}/${path}`}
              className={({ isActive }) =>
                cx(
                  'press relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[11px] font-medium',
                  isActive ? 'text-fg' : 'text-muted hover:text-fg',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="bottom-active"
                      transition={UI_SPRING}
                      className="absolute inset-0 rounded-2xl border border-line-strong bg-brand-soft"
                    >
                      <span className="absolute -bottom-px left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[#e3c98f] shadow-[0_0_10px_#e3c98f]" />
                    </motion.span>
                  )}
                  <Icon className={cx('relative size-[22px]', isActive && 'text-brand-text')} strokeWidth={isActive ? 2.1 : 1.75} />
                  <span className="relative max-w-full truncate">{t(labelKey)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
