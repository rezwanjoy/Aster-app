import { useState } from 'react';
import { useI18n } from '@/i18n';
import { IconCalendarCheck, IconUsers } from '@/components/icons';
import { nameOf } from '@/lib/names';
import { useAppData, useScope } from '@/store/hooks';
import { CalendarSheet } from './CalendarSheet';

/**
 * Sits at the top of the teacher pages that depend on a batch: the one global batch switcher
 * (with "All batches"), plus today's date which opens the calendar (brief §23).
 */
export function ContextBar() {
  const { t, d, lang } = useI18n();
  const { filter, setFilter, today } = useScope();
  const { batches } = useAppData();
  const [calendar, setCalendar] = useState(false);

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <label className="relative min-w-0 flex-1 sm:flex-none">
        <span className="sr-only">{t('teacher.switcher.label')}</span>
        <IconUsers width={18} height={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-brand-text" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="min-h-11 w-full cursor-pointer appearance-none rounded-2xl border border-line-strong bg-glass py-2 pr-9 pl-10 text-sm font-semibold text-fg sm:w-64"
        >
          <option value="all">{t('teacher.switcher.all', { n: batches.length })}</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {nameOf(b, lang)}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs text-muted">
          ▾
        </span>
      </label>

      <button
        type="button"
        onClick={() => setCalendar(true)}
        aria-label={`${t('calendar.open')}: ${d(today, { weekday: 'long', day: 'numeric', month: 'long' })}`}
        className="press inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border border-line-strong bg-glass px-4 text-sm font-semibold hover:bg-surface-2"
      >
        <IconCalendarCheck width={18} height={18} className="text-gold" />
        <span>{d(today, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
      </button>
      <CalendarSheet open={calendar} onClose={() => setCalendar(false)} />
    </div>
  );
}
