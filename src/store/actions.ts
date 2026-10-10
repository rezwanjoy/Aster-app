// Cross-store actions: backup, import and reset touch both the data store and the settings store.
import { createBackup, mergeImportedSettings, parseBackup } from '@/lib/backup';
import { todayISO } from '@/lib/dates';
import { generateSeed } from '@/data/seed';
import { getData, useData } from './data';
import { getSettings, useSettings } from './settings';

/** JSON text of the full backup (the AI key is never included). */
export const exportBackupText = (): string => createBackup(getData(), getSettings());

/** Restore from backup text. Returns an error message, or null on success. */
export function importBackupText(text: string): string | null {
  const parsed = parseBackup(text);
  if (!parsed.ok) return parsed.error;
  useData.getState().replaceAll(parsed.data);
  useSettings.getState().patchSettings({
    ...mergeImportedSettings(getSettings(), parsed.settings),
    activeStudentId: parsed.data.students[0]?.id,
    batchFilter: 'all',
  });
  return null;
}

/** "Reset demo data": regenerate the sample school, relative to today. */
export function resetDemoData(): void {
  const seed = generateSeed(todayISO());
  useData.getState().replaceAll(seed);
  useSettings.getState().patchSettings({ activeStudentId: seed.students[0]?.id, batchFilter: 'all' });
}

/** Seeds the active student on a fresh install so Student mode has someone to show. */
export function ensureActiveStudent(): void {
  const { activeStudentId, patchSettings } = useSettings.getState();
  const students = useData.getState().students;
  if (students.length && !students.some((s) => s.id === activeStudentId)) patchSettings({ activeStudentId: students[0].id });
}
