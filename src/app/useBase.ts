import { useLocation } from 'react-router-dom';

/** The teacher pages are shared by teachers and centers; links must stay on whichever side you are on. */
export function useBase(): '/teacher' | '/center' {
  return useLocation().pathname.startsWith('/center') ? '/center' : '/teacher';
}
