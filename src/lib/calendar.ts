// Calendar events for a month (brief §23): exams, class days, fee due dates, holidays and custom events.
import type { AppData, ID } from '@/types';
import { dayInMonth, daysInMonth, weekdayOf } from './dates';
import { DEFAULT_GRACE_DAY } from './fees';

export type CalendarKind = 'exam' | 'class' | 'fee' | 'holiday' | 'event';

export interface CalendarItem {
  date: string;
  kind: CalendarKind;
  /** Text to show for custom events, exams and batches (already the user's own words). */
  title: string;
  batchId?: ID;
  /** Set for exams so the UI can open them. */
  assessmentId?: ID;
  /** Set for custom events so they can be edited or deleted. */
  eventId?: ID;
}

const order: Record<CalendarKind, number> = { holiday: 0, exam: 1, fee: 2, class: 3, event: 4 };

/** Everything happening in `month` (YYYY-MM) for the given batches. Classes are skipped on holidays. */
export function calendarItems(d: AppData, month: string, batchIds: ID[], graceDay: number = DEFAULT_GRACE_DAY): CalendarItem[] {
  const items: CalendarItem[] = [];
  const inScope = (b?: ID) => !b || batchIds.includes(b);

  for (const a of d.assessments) {
    if (a.date.startsWith(month) && batchIds.includes(a.batchId)) items.push({ date: a.date, kind: 'exam', title: a.name, batchId: a.batchId, assessmentId: a.id });
  }
  for (const e of d.events) {
    if (e.date.startsWith(month) && inScope(e.batchId)) items.push({ date: e.date, kind: e.kind, title: e.title, batchId: e.batchId, eventId: e.id });
  }
  const holidays = new Set(d.events.filter((e) => e.kind === 'holiday' && inScope(e.batchId)).map((e) => e.date));
  const term = d.terms.find((t) => t.id === d.currentTermId);
  for (const b of d.batches) {
    if (!batchIds.includes(b.id)) continue;
    if (b.monthlyFee > 0) items.push({ date: dayInMonth(month, graceDay), kind: 'fee', title: b.name, batchId: b.id });
    for (let day = 1; day <= daysInMonth(month); day++) {
      const date = dayInMonth(month, day);
      if (!b.classDays.includes(weekdayOf(date)) || holidays.has(date)) continue;
      if (term && (date < term.startDate || date > term.endDate)) continue;
      items.push({ date, kind: 'class', title: b.name, batchId: b.id });
    }
  }
  return items.sort((a, b) => a.date.localeCompare(b.date) || order[a.kind] - order[b.kind] || a.title.localeCompare(b.title));
}

/** Group items by date for rendering a month grid. */
export function groupByDate(items: CalendarItem[]): Map<string, CalendarItem[]> {
  const map = new Map<string, CalendarItem[]>();
  for (const it of items) map.set(it.date, [...(map.get(it.date) ?? []), it]);
  return map;
}
