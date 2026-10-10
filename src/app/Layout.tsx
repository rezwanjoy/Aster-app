import { useEffect, useState } from 'react';
import { Navigate, useLocation, useOutlet } from 'react-router-dom';
import { MotionConfig, motion } from 'motion/react';
import { useI18n } from '@/i18n';
import { useSettings, type Mode } from '@/store/settings';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { UpdatePrompt } from './UpdatePrompt';
import { isInstalledApp } from '@/lib/installed';
import { ensureActiveStudent } from '@/store/actions';
import { ContextBar } from '@/features/teacher/ContextBar';
import { StudentBar } from '@/features/student/StudentBar';

/** Applies theme + language to <html> and keeps them in sync with settings. */
function useDocumentSettings() {
  const lang = useSettings((s) => s.lang);
  const theme = useSettings((s) => s.theme);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a0914' : '#f4f2fb');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

/** Page enter transition: each route mounts fresh (keyed by path) and fades/rises in. */
function PageTransition() {
  const outlet = useOutlet();
  const [frozen] = useState(outlet);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
    >
      {frozen}
    </motion.div>
  );
}

export function Layout() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const setMode = useSettings((s) => s.setMode);
  const mode = useSettings((s) => s.mode);
  const welcomed = useSettings((s) => s.welcomed);
  const lockedRole = useSettings((s) => s.lockedRole);
  const keepOut = lockedRole === 'student' && (pathname.startsWith('/teacher') || pathname.startsWith('/center'));
  const bare = pathname === '/welcome' || pathname === '/home' || pathname.startsWith('/signin/');
  useDocumentSettings();
  // Pages that follow the global batch switcher (brief §23)
  const showContext = /^\/(teacher|center)\/(today|marks|insights|fees)\/?$/.test(pathname);
  const showStudentBar = pathname.startsWith('/student/');
  useEffect(() => ensureActiveStudent(), []);

  // Deep links like /student/plan switch the mode to match the URL.
  useEffect(() => {
    if (bare || keepOut) return;
    const first = pathname.split('/')[1];
    if (first === 'teacher' || first === 'center' || first === 'student') setMode(first as Mode);
  }, [pathname, setMode, bare, keepOut]);
  useEffect(() => {
    if (lockedRole === 'student') setMode('student');
  }, [lockedRole, setMode]);

  // First visit: the home page in a browser; the installed app goes straight to the role picker.
  if (!welcomed && !bare) return <Navigate to={isInstalledApp() ? '/welcome' : mode === 'student' ? '/signin/student' : '/home'} replace />;
  if (keepOut) return <Navigate to="/student/plan" replace />;
  if (welcomed && pathname === '/welcome') return <Navigate to="/" replace />;

  return (
    // reducedMotion="user": motion drops transform/layout animation when the OS asks for less motion.
    <MotionConfig reducedMotion="user">
      <div className="aurora" aria-hidden="true" />
      <div className={bare ? 'min-h-dvh px-4 sm:px-6' : 'min-h-dvh lg:pl-(--side-w)'}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-fg"
        >
          {t('app.skipToContent')}
        </a>
        {!bare && <Sidebar />}
        {!bare && <TopBar />}
        <main
          id="main"
          className={bare ? 'w-full' : 'mx-auto w-full max-w-6xl px-4 pt-6 pb-[calc(var(--nav-h)+2.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-12'}
        >
          {showContext && <ContextBar />}
          {showStudentBar && <StudentBar />}
          <PageTransition key={pathname} />
        </main>
        {!bare && <BottomNav />}
        <UpdatePrompt />
      </div>
    </MotionConfig>
  );
}

