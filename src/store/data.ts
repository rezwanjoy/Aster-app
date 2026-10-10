import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppData, CollectionKey, ID } from '@/types';
import { emptyData, generateSeed } from '@/data/seed';
import { todayISO } from '@/lib/dates';
import { pickData } from '@/lib/backup';
import * as ops from '@/lib/ops';
import { DATA_VERSION, migrateData } from './migrations';

export const DATA_STORAGE_KEY = 'aster-data';

/** First launch gets the demo data; a returning user's saved data is loaded over an empty shell. */
function initialData(): AppData {
  try {
    if (localStorage.getItem(DATA_STORAGE_KEY)) return emptyData();
  } catch {
    /* storage unavailable: fall through to the demo data */
  }
  return generateSeed(todayISO());
}

interface DataActions {
  /** Run any pure operation from lib/ops on the data. */
  apply: (fn: (d: AppData) => AppData) => void;
  upsert: <K extends CollectionKey>(key: K, item: AppData[K][number]) => void;
  patch: <K extends CollectionKey>(key: K, id: ID, changes: Partial<AppData[K][number]>) => void;
  remove: (key: CollectionKey, id: ID) => void;
  removeBatch: (id: ID) => void;
  removeTeacher: (id: ID) => void;
  removeStudent: (id: ID) => void;
  removeSubject: (id: ID) => void;
  removeTopic: (id: ID) => void;
  removeTerm: (id: ID) => void;
  setScore: (assessmentId: ID, studentId: ID, topicId: ID, value: number | null) => void;
  sendMessage: (studentId: ID, batchId: ID, body: string) => void;
  markMessagesRead: (studentId: ID) => void;
  replaceAll: (data: AppData) => void;
}

export const useData = create<AppData & DataActions>()(
  persist(
    (set) => {
      const run = (fn: (d: AppData) => AppData) => set((s) => fn(pickData(s)));
      return {
        ...initialData(),
        apply: run,
        upsert: (key, item) => run((d) => ops.upsert(d, key, item)),
        patch: (key, id, changes) => run((d) => ops.patch(d, key, id, changes)),
        remove: (key, id) => run((d) => ops.removeById(d, key, id)),
        removeBatch: (id) => run((d) => ops.removeBatch(d, id)),
        removeTeacher: (id) => run((d) => ops.removeTeacher(d, id)),
        removeStudent: (id) => run((d) => ops.removeStudent(d, id)),
        removeSubject: (id) => run((d) => ops.removeSubject(d, id)),
        removeTopic: (id) => run((d) => ops.removeTopic(d, id)),
        removeTerm: (id) => run((d) => ops.removeTerm(d, id)),
        setScore: (a, s, t, v) => run((d) => ops.setScore(d, a, s, t, v)),
        sendMessage: (studentId, batchId, body) => run((d) => ops.sendMessage(d, studentId, batchId, body)),
        markMessagesRead: (studentId) => run((d) => ops.markMessagesRead(d, studentId)),
        replaceAll: (data) => set(pickData(data)),
      };
    },
    {
      name: DATA_STORAGE_KEY,
      version: DATA_VERSION,
      partialize: (s) => pickData(s),
      migrate: (persisted, version) => migrateData(persisted, version),
    },
  ),
);

/** Current school data without the action functions. */
export const getData = (): AppData => pickData(useData.getState());
