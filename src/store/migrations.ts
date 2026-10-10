// Versioned persistence. To change a stored shape: bump the version constant and add a
// step keyed by the version it migrates FROM. Steps are pure and run in order.
import type { AppData, Settings } from '@/types';
import { DEFAULT_SETTINGS } from './defaults';
import { addTeachers } from '@/lib/teachers';

export const DATA_VERSION = 3;
export const SETTINGS_VERSION = 5;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MigrationStep = (state: any) => any;
export type MigrationSteps = Record<number, MigrationStep>;

/** School data. v1 → v2 added teachers (the owner, plus the sample teachers if the sample batches exist); v2 → v3 added teacher salary payments. */
export const dataMigrations: MigrationSteps = {
  1: (d) => addTeachers(d),
  2: (d) => ({ ...d, salaries: d?.salaries ?? [] }),
};

/** Settings. v1 → v2 added the grading, AI, report and batch-filter fields; v2 → v3 added the welcome screen flag; v3 → v4 added AI consent and the default model; v4 → v5 removed the on-device AI key. */
export const settingsMigrations: MigrationSteps = {
  1: (s) => ({ ...DEFAULT_SETTINGS, ...s, ai: { ...DEFAULT_SETTINGS.ai, ...(s?.ai ?? {}) } }),
  // existing users already chose how to use the app, so they skip the welcome screen
  2: (s) => ({ ...s, welcomed: true }),
  3: (s) => ({ ...s, ai: { ...DEFAULT_SETTINGS.ai, ...(s?.ai ?? {}), model: s?.ai?.model || DEFAULT_SETTINGS.ai.model, consented: false } }),
  // v4 → v5: the AI key moved to the server, so drop any key saved on this device
  4: (s) => {
    const { apiKey: _key, enabled: _on, ...ai } = s?.ai ?? {};
    return { ...s, ai: { ...DEFAULT_SETTINGS.ai, ...ai } };
  },
};

/** Run every step from `from` up to `to`. Throws if a step is missing or the data is from the future. */
export function runMigrations(raw: unknown, from: number, to: number, steps: MigrationSteps): unknown {
  if (from > to) throw new Error(`Data is from a newer version of Aster (v${from}, this app understands up to v${to}).`);
  let state = raw;
  for (let v = from; v < to; v++) {
    const step = steps[v];
    if (!step) throw new Error(`No migration from version ${v}`);
    state = step(state);
  }
  return state;
}

export const migrateData = (raw: unknown, from: number, steps: MigrationSteps = dataMigrations, to: number = DATA_VERSION) =>
  runMigrations(raw, from, to, steps) as AppData;

export const migrateSettings = (raw: unknown, from: number, steps: MigrationSteps = settingsMigrations, to: number = SETTINGS_VERSION) =>
  runMigrations(raw, from, to, steps) as Settings;
