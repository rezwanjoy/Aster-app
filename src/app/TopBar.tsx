import { useNavigate, Link } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useSettings, type Mode, type Theme } from '@/store/settings';
import { BrandMark, IconMonitor, IconMoon, IconSun, IconUser } from '@/components/icons';
import { IconButton, Segmented } from '@/components/ui';
import { homePath } from './nav';

const nextTheme: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' };
const themeIcon = { light: IconSun, dark: IconMoon, system: IconMonitor };

export function TopBar() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { lang, setLang, theme, setTheme, mode, setMode, lockedRole } = useSettings();
  const ThemeIcon = themeIcon[theme];

  const changeMode = (m: Mode) => {
    setMode(m);
    navigate(homePath(m));
  };

  return (
    <header className="sticky top-0 z-20 px-3 pt-3 sm:px-5 lg:px-8">
      <div className="glass-blur mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 rounded-[1.75rem] px-3 py-2 shadow-card lg:flex-nowrap lg:justify-end">
        {/* Brand: phone/tablet only (PC shows it in the side menu) */}
        <Link to={mode !== 'student' ? '/home' : homePath(mode)} aria-label={mode !== 'student' ? `${t('app.name')}: ${t('profile.homePage')}` : t('app.name')} className="mr-auto flex min-h-11 items-center gap-2 pl-1 sm:mr-0 lg:hidden">
          <BrandMark size={32} />
          <span className="font-display text-lg font-semibold tracking-[-0.02em]">{t('app.name')}</span>
        </Link>

        {/* Mode switch: own row on phones, inline from 640px up */}
        {lockedRole !== 'student' && <Segmented
          label={t('mode.label')}
          value={mode}
          onChange={changeMode}
          className="order-last w-full sm:order-none sm:ml-auto sm:w-auto lg:ml-0"
          options={[
            { value: 'teacher', label: t('mode.teacher') },
            { value: 'center', label: t('mode.center') },
            { value: 'student', label: t('mode.student') },
          ]}
        />}

        <div className="flex items-center gap-1">
          <Segmented
            label={t('topbar.language')}
            value={lang}
            onChange={setLang}
            options={[
              { value: 'en', label: 'EN', ariaLabel: 'English' },
              { value: 'bn', label: 'বাং', ariaLabel: 'বাংলা' },
            ]}
          />
          <IconButton label={`${t('topbar.theme')}: ${t(`theme.${theme}`)}`} onClick={() => setTheme(nextTheme[theme])}>
            <ThemeIcon width={22} height={22} />
          </IconButton>
          <Link
            to="/profile"
            aria-label={t('nav.settings')}
            title={t('nav.settings')}
            className="press inline-flex size-11 items-center justify-center rounded-2xl text-fg hover:bg-surface-2 lg:hidden"
          >
            <IconUser width={22} height={22} />
          </Link>
        </div>
      </div>
    </header>
  );
}
