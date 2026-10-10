// Export / import / validate the whole app as one JSON file (brief §14, D14).
import type { AppData, CollectionKey, Settings } from '@/types';
import { DATA_VERSION, migrateData, migrateSettings, SETTINGS_VERSION } from '@/store/migrations';
import { checkIntegrity } from './ops';

export const BACKUP_FORMAT = 1;

const COLLECTIONS: CollectionKey[] = ['teachers', 'salaries', 'terms', 'subjects', 'topics', 'batches', 'students', 'goals', 'sessions', 'assessments', 'fees', 'plans', 'events', 'messages'];

/** Keys that make up the school data (everything except device settings). */
export const DATA_KEYS: (keyof AppData)[] = ['profile', 'currentTermId', 'interest', ...COLLECTIONS];

export const pickData = (state: AppData): AppData => Object.fromEntries(DATA_KEYS.map((k) => [k, state[k]])) as unknown as AppData;

/** Structural + referential checks. Returns human-readable problems (empty = valid). */
export function validateAppData(x: unknown): string[] {
  if (typeof x !== 'object' || x === null) return ['Backup data is not an object'];
  const d = x as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof d.profile !== 'object' || d.profile === null) errors.push('Missing profile');
  if (typeof d.currentTermId !== 'string') errors.push('Missing currentTermId');
  if (!Array.isArray(d.interest)) errors.push('interest must be a list');
  for (const key of COLLECTIONS) {
    const list = d[key];
    if (!Array.isArray(list)) errors.push(`${key} must be a list`);
    else if (list.some((r) => typeof r !== 'object' || r === null || typeof (r as { id?: unknown }).id !== 'string')) errors.push(`${key} has an item without an id`);
  }
  if (errors.length) return errors;
  return checkIntegrity(x as AppData);
}

export function createBackup(data: AppData, settings: Settings, now: Date = new Date()): string {
  return JSON.stringify(
    {
      app: 'aster',
      backupFormat: BACKUP_FORMAT,
      dataVersion: DATA_VERSION,
      settingsVersion: SETTINGS_VERSION,
      exportedAt: now.toISOString(),
      data: pickData(data),
      settings,
    },
    null,
    2,
  );
}

export type ParsedBackup = { ok: true; data: AppData; settings: Settings } | { ok: false; error: string };

export function parseBackup(text: string): ParsedBackup {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' };
  }
  if (!raw || raw.app !== 'aster' || typeof raw.data !== 'object') return { ok: false, error: 'This is not an Aster backup file.' };
  try {
    const data = migrateData(raw.data, Number(raw.dataVersion ?? 1));
    const settings = migrateSettings(raw.settings ?? {}, Number(raw.settingsVersion ?? 1));
    const problems = validateAppData(data);
    if (problems.length) return { ok: false, error: `The backup is damaged: ${problems[0]}` };
    return { ok: true, data: pickData(data), settings };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not read this backup.' };
  }
}

/** Imported display preferences replace the current ones, but never this device's AI consent, usage count, active mode or welcome flag. */
export function mergeImportedSettings(current: Settings, imported: Settings): Settings {
  return { ...imported, mode: current.mode, lockedRole: current.lockedRole, welcomed: current.welcomed, ai: current.ai };
}
