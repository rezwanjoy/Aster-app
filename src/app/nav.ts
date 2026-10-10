import type { ComponentType, SVGProps } from 'react';
import type { Mode } from '@/store/settings';
import type { TKey } from '@/i18n';
import { IconCalendarCheck, IconChart, IconGrid, IconHome, IconPencil, IconTarget, IconTrend, IconUsers, IconWallet } from '@/components/icons';

export interface NavItem {
  path: string; // relative to the mode, e.g. "today"
  labelKey: TKey;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

// Same items drive the phone bottom nav and the PC side menu.
const STAFF: NavItem[] = [
    { path: 'today', labelKey: 'nav.teacher.today', Icon: IconHome },
    { path: 'batches', labelKey: 'nav.teacher.batches', Icon: IconUsers },
    { path: 'marks', labelKey: 'nav.teacher.marks', Icon: IconPencil },
    { path: 'insights', labelKey: 'nav.teacher.insights', Icon: IconChart },
    { path: 'fees', labelKey: 'nav.teacher.fees', Icon: IconWallet },
];

export const NAV: Record<Mode, NavItem[]> = {
  teacher: STAFF,
  center: STAFF,
  student: [
    { path: 'plan', labelKey: 'nav.student.plan', Icon: IconCalendarCheck },
    { path: 'progress', labelKey: 'nav.student.progress', Icon: IconTrend },
    { path: 'topics', labelKey: 'nav.student.topics', Icon: IconGrid },
    { path: 'goals', labelKey: 'nav.student.goals', Icon: IconTarget },
  ],
};

export const homePath = (mode: Mode) => `/${mode}/${NAV[mode][0].path}`;
