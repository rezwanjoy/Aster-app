import type { Settings } from '@/types';
import { DEFAULT_GRADE_BANDS } from '@/lib/grading';

export const DEFAULT_SETTINGS: Settings = {
  lang: 'en',
  theme: 'system',
  banglaNumerals: true,
  mode: 'teacher',
  welcomed: false,
  activeStudentId: undefined,
  batchFilter: 'all',
  gradingScale: 'percent',
  gradeBands: DEFAULT_GRADE_BANDS,
  masteryBands: { redBelow: 50, greenFrom: 70 },
  reportStyle: { accent: '#5b3bd6', teacherMessage: '' },
  reminderTemplate: {
    en: 'Assalamu alaikum. A gentle reminder: {student}\'s fee of {amount} for {month} is pending at {center}. Thank you.',
    bn: 'আসসালামু আলাইকুম। {center}-এ {student}-এর {month} মাসের {amount} ফি বাকি আছে। ধন্যবাদ।',
  },
  // Verified 2026-10-09: Google recommends gemini-3.5-flash-lite for new projects. Editable in Profile.
  ai: { model: 'gemini-3.5-flash-lite', consented: false, usage: { month: '', count: 0 } },
  teacherPin: undefined,
};
