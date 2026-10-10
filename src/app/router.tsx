import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './Layout';
import { homePath } from './nav';
import { isInstalledApp } from '@/lib/installed';
import { useSettings } from '@/store/settings';
import { BrandMark } from '@/components/icons';

// Route-level code splitting keeps the first load small (brief §16).
const page = <T extends string>(load: () => Promise<Record<T, React.ComponentType>>, name: T) => ({
  lazy: async () => ({ Component: (await load())[name] }),
});

/** Shown while the first lazy route loads. */
function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-busy="true">
      <div className="rise-in">
        <BrandMark size={56} />
      </div>
    </div>
  );
}

function Home() {
  const mode = useSettings((s) => s.mode);
  return <Navigate to={isInstalledApp() ? homePath(mode) : '/home'} replace />;
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    HydrateFallback: Splash,
    children: [
      { path: '/', element: <Home /> },
      { path: '/welcome', ...page(() => import('@/pages/Welcome'), 'Welcome') },
      { path: '/home', ...page(() => import('@/pages/Landing'), 'Landing') },
      { path: '/signin/:role', ...page(() => import('@/pages/SignIn'), 'SignIn') },
      { path: '/teacher/today', ...page(() => import('@/pages/teacher/Today'), 'TeacherToday') },
      { path: '/teacher/batches', ...page(() => import('@/pages/teacher/Batches'), 'TeacherBatches') },
      { path: '/teacher/center', element: <Navigate to="/center/batches" replace /> },
      { path: '/teacher/marks', ...page(() => import('@/pages/teacher/Marks'), 'TeacherMarks') },
      { path: '/teacher/marks/:examId', ...page(() => import('@/pages/teacher/MarkEntry'), 'TeacherMarkEntry') },
      { path: '/teacher/students/:id', ...page(() => import('@/pages/teacher/StudentDetail'), 'TeacherStudentDetail') },
      { path: '/teacher/batches/:id', ...page(() => import('@/pages/teacher/BatchDetail'), 'TeacherBatchDetail') },
      { path: '/teacher/insights', ...page(() => import('@/pages/teacher/Insights'), 'TeacherInsights') },
      { path: '/teacher/fees', ...page(() => import('@/pages/teacher/Fees'), 'TeacherFees') },
      { path: '/center/today', ...page(() => import('@/pages/teacher/Today'), 'TeacherToday') },
      { path: '/center/batches', ...page(() => import('@/pages/teacher/Batches'), 'TeacherBatches') },
      { path: '/center/marks', ...page(() => import('@/pages/teacher/Marks'), 'TeacherMarks') },
      { path: '/center/marks/:examId', ...page(() => import('@/pages/teacher/MarkEntry'), 'TeacherMarkEntry') },
      { path: '/center/students/:id', ...page(() => import('@/pages/teacher/StudentDetail'), 'TeacherStudentDetail') },
      { path: '/center/batches/:id', ...page(() => import('@/pages/teacher/BatchDetail'), 'TeacherBatchDetail') },
      { path: '/center/insights', ...page(() => import('@/pages/teacher/Insights'), 'TeacherInsights') },
      { path: '/center/fees', ...page(() => import('@/pages/teacher/Fees'), 'TeacherFees') },
      { path: '/student/plan', ...page(() => import('@/pages/student/Plan'), 'StudentPlan') },
      { path: '/student/progress', ...page(() => import('@/pages/student/Progress'), 'StudentProgress') },
      { path: '/student/topics', ...page(() => import('@/pages/student/Topics'), 'StudentTopics') },
      { path: '/student/goals', ...page(() => import('@/pages/student/Goals'), 'StudentGoals') },
      { path: '/plans', ...page(() => import('@/pages/Plans'), 'Plans') },
      { path: '/profile', ...page(() => import('@/pages/Profile'), 'Profile') },
      { path: '/settings', element: <Navigate to="/profile" replace /> },
      { path: '/student/inbox', ...page(() => import('@/pages/student/Inbox'), 'StudentInbox') },
      { path: '*', element: <Home /> },
    ],
  },
]);
