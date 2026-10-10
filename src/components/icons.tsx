import { useId } from 'react';
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base: IconProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

const make = (paths: React.ReactNode) =>
  function Icon(props: IconProps) {
    return (
      <svg {...base} {...props}>
        {paths}
      </svg>
    );
  };

export const IconHome = make(<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>);
export const IconUsers = make(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.6a3.5 3.5 0 010 6.8" /><path d="M18 14.3c2 .8 3.5 2.6 3.5 5.7" /></>);
export const IconPencil = make(<><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 013 3L8 19l-4 1z" /><path d="M14 7l3 3" /></>);
export const IconChart = make(<><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 16v-4" /><path d="M12 16V8" /><path d="M16 16v-6" /></>);
export const IconWallet = make(<><path d="M3 7a2 2 0 012-2h13v4" /><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="16.5" cy="13.5" r="1.2" /></>);
export const IconCalendarCheck = make(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /><path d="M9 15l2 2 4-4" /></>);
export const IconTrend = make(<><path d="M3 17l6-6 4 4 8-9" /><path d="M15 6h6v6" /></>);
export const IconGrid = make(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>);
export const IconTarget = make(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>);
export const IconSettings = make(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5h0a1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></>);
export const IconSun = make(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>);
export const IconMoon = make(<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />);
export const IconMonitor = make(<><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>);
export const IconAlert = make(<><path d="M12 3l10 18H2L12 3z" /><path d="M12 10v5M12 18h.01" /></>);
export const IconCheck = make(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const IconMinus = make(<path d="M6 12h12" />);
export const IconStar = make(<path d="M12 3l2.6 5.9 6.4.6-4.8 4.2 1.4 6.3L12 16.8 6.4 20l1.4-6.3L3 9.5l6.4-.6L12 3z" />);

/** Brand mark: the original Aster star, champagne on a royal-violet tile. */
export function BrandMark({ size = 32 }: { size?: number }) {
  // Unique ids: the sidebar and top bar both render a mark, and a gradient inside a
  // display:none copy would otherwise win the id lookup and render nothing.
  const uid = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${uid}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8a6dff" />
          <stop offset="1" stopColor="#3a1fa0" />
        </linearGradient>
        <linearGradient id={`${uid}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3d4" />
          <stop offset="1" stopColor="#d8b878" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="128" fill={`url(#${uid}g)`} />
      <rect x="6" y="6" width="500" height="500" rx="122" fill="none" stroke="#e3c98f" strokeOpacity=".55" strokeWidth="6" />
      <path fill={`url(#${uid}s)`} d="M256 92l46 107 116 10-88 76 27 114-101-61-101 61 27-114-88-76 116-10z" />
    </svg>
  );
}

export const IconFlame = make(<path d="M12 22c4 0 7-2.8 7-7 0-3-1.6-5-3.2-6.6-.5 1.4-1.3 2.2-2.3 2.6C13.6 7.8 12.4 4.8 10 2 10 6 5 8.5 5 15c0 4.2 3 7 7 7z" />);
export const IconSparkle = make(<><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" /><path d="M19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16z" /></>);
export const IconClock = make(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const IconArrowUpRight = make(<><path d="M7 17L17 7" /><path d="M8 7h9v9" /></>);
export const IconBell = make(<><path d="M6 17V11a6 6 0 1112 0v6l1.5 2h-15L6 17z" /><path d="M10 21h4" /></>);
export const IconChevronRight = make(<path d="M9 5l7 7-7 7" />);
export const IconLock = make(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 118 0v3" /></>);
export const IconUser = make(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>);
export const IconInbox = make(<><path d="M3 13l3-8h12l3 8" /><path d="M3 13v6h18v-6h-5l-1 2h-6l-1-2H3z" /></>);
export const IconMic = make(<><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></>);
export const IconFile = make(<><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>);
export const IconCloud = make(<><path d="M7 18a4 4 0 01-.5-7.97A5.5 5.5 0 0117 8.5 4.5 4.5 0 0117.5 18H7z" /></>);
export const IconLayers = make(<><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></>);
