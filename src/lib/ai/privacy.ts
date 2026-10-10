// A last safety net before anything is sent: refuse if the text contains any personal detail from the app's data.
import type { AppData } from '@/types';

/** Personal strings from the data that must never appear in an AI request. */
function sensitiveStrings(d: AppData): string[] {
  const out = new Set<string>();
  const add = (s?: string) => {
    const v = s?.trim();
    if (v && v.length >= 4) out.add(v.toLowerCase());
  };
  for (const s of d.students) {
    add(s.name);
    add(s.nameBn);
    add(s.guardianName);
    add(s.guardianPhone);
    add(s.guardianPhone?.replace(/\D/g, ''));
  }
  for (const text of [d.profile.teacherName, d.profile.centerName]) {
    add(text.en);
    add(text.bn);
  }
  add(d.profile.phone);
  for (const b of d.batches) {
    add(b.name);
    add(b.nameBn);
  }
  return [...out];
}

/** The personal details found in `text` (empty = safe to send). */
export function findPersonalData(d: AppData, text: string): string[] {
  const hay = text.toLowerCase();
  return sensitiveStrings(d).filter((s) => hay.includes(s));
}
