import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GradingScale, ID, Lang, Mode, Settings, Theme } from '@/types';
import { DEFAULT_SETTINGS } from './defaults';
import { migrateSettings, SETTINGS_VERSION } from './migrations';

export type { Mode, Theme };

interface SettingsActions {
  setLang: (lang: Lang) => void;
  setTheme: (theme: Theme) => void;
  setBanglaNumerals: (on: boolean) => void;
  setMode: (mode: Mode) => void;
  setBatchFilter: (id: ID | 'all') => void;
  setActiveStudent: (id: ID | undefined) => void;
  setGradingScale: (scale: GradingScale) => void;
  /** Merge any settings fields (used by import and by later settings screens). */
  patchSettings: (changes: Partial<Settings>) => void;
}

export const useSettings = create<Settings & SettingsActions>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setLang: (lang) => set({ lang }),
      setTheme: (theme) => set({ theme }),
      setBanglaNumerals: (banglaNumerals) => set({ banglaNumerals }),
      setMode: (mode) => set({ mode }),
      setBatchFilter: (batchFilter) => set({ batchFilter }),
      setActiveStudent: (activeStudentId) => set({ activeStudentId }),
      setGradingScale: (gradingScale) => set({ gradingScale }),
      patchSettings: (changes) => set(changes),
    }),
    {
      name: 'aster-settings',
      version: SETTINGS_VERSION,
      migrate: (persisted, version) => migrateSettings(persisted, version),
    },
  ),
);

/** Plain settings values (no actions), e.g. for backups. */
export const getSettings = (): Settings => {
  const { setLang, setTheme, setBanglaNumerals, setMode, setBatchFilter, setActiveStudent, setGradingScale, patchSettings, ...values } = useSettings.getState();
  void [setLang, setTheme, setBanglaNumerals, setMode, setBatchFilter, setActiveStudent, setGradingScale, patchSettings];
  return values;
};
