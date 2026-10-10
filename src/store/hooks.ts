import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { AppData, Batch } from '@/types';
import { pickData } from '@/lib/backup';
import { todayISO } from '@/lib/dates';
import { scopeBatchIds, type BatchFilter } from '@/lib/scope';
import { useData } from './data';
import { useSettings } from './settings';

/** All school data (re-renders only when a collection actually changes). */
export const useAppData = (): AppData => useData(useShallow((s) => pickData(s)));

/** Today's date; stable for the life of the page. */
export const useToday = (): string => useMemo(() => todayISO(), []);

export interface Scope {
  /** the chosen filter, falling back to "all" if that batch no longer exists */
  filter: BatchFilter;
  batchIds: string[];
  batches: Batch[];
  today: string;
  setFilter: (f: BatchFilter) => void;
}

/** The global teacher batch switcher (brief §23). */
export function useScope(): Scope {
  const data = useAppData();
  const saved = useSettings((s) => s.batchFilter);
  const setFilter = useSettings((s) => s.setBatchFilter);
  const today = useToday();
  const filter: BatchFilter = saved === 'all' || data.batches.some((b) => b.id === saved) ? saved : 'all';
  const batchIds = useMemo(() => scopeBatchIds(data, filter), [data, filter]);
  const batches = useMemo(() => data.batches.filter((b) => batchIds.includes(b.id)), [data, batchIds]);
  return { filter, batchIds, batches, today, setFilter };
}

/** The student using Aster in Student mode (falls back to the first student). */
export function useActiveStudent() {
  const data = useAppData();
  const id = useSettings((s) => s.activeStudentId);
  const today = useToday();
  const student = data.students.find((s) => s.id === id) ?? data.students[0];
  return { data, student, today };
}
