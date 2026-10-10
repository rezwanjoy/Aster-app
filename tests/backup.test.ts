import { describe, expect, it } from 'vitest';
import { generateSeed } from '../src/data/seed';
import { createBackup, mergeImportedSettings, parseBackup, pickData, validateAppData } from '../src/lib/backup';
import { DEFAULT_SETTINGS } from '../src/store/defaults';
import { DATA_VERSION, migrateData, migrateSettings } from '../src/store/migrations';

const data = generateSeed('2026-10-08');
const settings = { ...DEFAULT_SETTINGS, lang: 'bn' as const, ai: { ...DEFAULT_SETTINGS.ai, model: 'x' } };

describe('backup round trip', () => {
  it('export → import returns identical data and settings', () => {
    const text = createBackup(data, settings, new Date('2026-10-08T00:00:00Z'));
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data).toEqual(pickData(data));
    expect(parsed.settings.lang).toBe('bn');
  });

  it('keeps this device\'s AI consent and mode when importing settings', () => {
    const current = { ...DEFAULT_SETTINGS, mode: 'student' as const, ai: { ...DEFAULT_SETTINGS.ai, consented: true } };
    const merged = mergeImportedSettings(current, { ...DEFAULT_SETTINGS, lang: 'bn' });
    expect(merged.ai.consented).toBe(true);
    expect(merged.mode).toBe('student');
    expect(merged.lang).toBe('bn');
  });
});

describe('importing bad files', () => {
  it('rejects text that is not JSON', () => {
    const r = parseBackup('hello');
    expect(r.ok).toBe(false);
  });
  it('rejects JSON that is not an Aster backup', () => {
    const r = parseBackup(JSON.stringify({ hello: 1 }));
    expect(r).toEqual({ ok: false, error: 'This is not an Aster backup file.' });
  });
  it('rejects a backup with a broken reference', () => {
    const broken = structuredClone(data);
    broken.fees[0].studentId = 'ghost';
    const r = parseBackup(createBackup(broken, settings));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('damaged');
  });
  it('rejects a backup from a newer version of the app', () => {
    const file = JSON.parse(createBackup(data, settings));
    file.dataVersion = 99;
    const r = parseBackup(JSON.stringify(file));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('newer version');
  });
  it('reports structural problems', () => {
    expect(validateAppData(null)).not.toEqual([]);
    expect(validateAppData({ ...data, batches: 'nope' })).toContain('batches must be a list');
    expect(validateAppData({ ...data, students: [{ name: 'no id' }] })).toContain('students has an item without an id');
  });
});

describe('migrations', () => {
  it('runs steps in order from the stored version', () => {
    const steps = {
      1: (s: { a: number }) => ({ ...s, b: s.a + 1 }),
      2: (s: { b: number }) => ({ ...s, c: s.b * 2 }),
    };
    expect(migrateData({ a: 1 }, 1, steps, 3)).toEqual({ a: 1, b: 2, c: 4 });
    expect(migrateData({ a: 1, b: 2 }, 2, steps, 3)).toEqual({ a: 1, b: 2, c: 4 });
  });
  it('throws on a missing step or future data', () => {
    expect(() => migrateData({}, 1, {}, 2)).toThrow('No migration from version 1');
    expect(() => migrateData({}, 5, {}, 2)).toThrow('newer version');
  });
  it('settings v1 → v2 fills in the new fields and keeps existing choices', () => {
    const old = { lang: 'bn', theme: 'dark', banglaNumerals: false, mode: 'student' };
    const next = migrateSettings(old, 1);
    expect(next.lang).toBe('bn');
    expect(next.theme).toBe('dark');
    expect(next.batchFilter).toBe('all');
    expect(next.ai.consented).toBe(false);
    expect(next.masteryBands).toEqual({ redBelow: 50, greenFrom: 70 });
  });
  it('current-version data passes through unchanged', () => {
    expect(migrateData(data, DATA_VERSION)).toBe(data);
  });
});

describe('settings v3', () => {
  it('v2 → v3 marks existing users as already welcomed; fresh installs are not', () => {
    expect(migrateSettings({ ...DEFAULT_SETTINGS }, 2).welcomed).toBe(true);
    expect(migrateSettings({ lang: 'bn' }, 1).welcomed).toBe(true); // chained 1 → 2 → 3
    expect(DEFAULT_SETTINGS.welcomed).toBe(false);
  });
  it('importing a backup never changes this device\'s welcome flag', () => {
    const merged = mergeImportedSettings({ ...DEFAULT_SETTINGS, welcomed: true }, { ...DEFAULT_SETTINGS, welcomed: false });
    expect(merged.welcomed).toBe(true);
  });
});
