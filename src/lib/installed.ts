/** True when opened from the phone's home screen (or installed on a PC) rather than in a browser tab. */
export const isInstalledApp = (): boolean =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
