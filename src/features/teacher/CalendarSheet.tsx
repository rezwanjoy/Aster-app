import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n';
import { formatMonth } from '@/i18n/format';
import { Button, Chip, IconButton, cx } from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Field, FormGrid, Select, TextInput } from '@/components/forms';
import { IconChevronRight, IconClock, IconPencil, IconWallet, IconAlert, IconStar } from '@/components/icons';
import { calendarItems, groupByDate, type CalendarItem, type CalendarKind } from '@/lib/calendar';
import { addMonths, dayInMonth, daysInMonth, isValidISODate, monthOf, weekdayOf } from '@/lib/dates';
import { newId } from '@/lib/ops';
import { WEEKDAYS } from '@/data/presets';
import { useData } from '@/store/data';
import { useSettings } from '@/store/settings';
import { useScope, useAppData } from '@/store/hooks';
import type { CalendarEvent } from '@/types';

const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5]; // Saturday first, like the school week
const kindIcon: Record<CalendarKind, typeof IconClock> = { exam: IconStar, class: IconClock, fee: IconWallet, holiday: IconAlert, event: IconPencil };
const dotClass: Record<CalendarKind, string> = {
  exam: 'rotate-45 rounded-[2px] bg-[#c9a45a]',
  class: 'rounded-full bg-[#8f78ff]',
  fee: 'rounded-sm bg-green-fg',
  holiday: 'rounded-none bg-red-fg [clip-path:polygon(50%_0,100%_100%,0_100%)]',
  event: 'rounded-full border-2 border-[#c9b8ff] bg-transparent',
};

/** Month calendar with exams, class days, fee dates, holidays and your own events. */
export function CalendarSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, n, d, lang } = useI18n();
  const data = useAppData();
  const { batchIds, today } = useScope();
  const banglaNumerals = useSettings((x) => x.banglaNumerals);
  const [month, setMonth] = useState(monthOf(today));
  const [selected, setSelected] = useState(today);
  const [editing, setEditing] = useState<Partial<CalendarEvent> | null>(null);
  const [deleting, setDeleting] = useState<CalendarItem | null>(null);

  const items = useMemo(() => calendarItems(data, month, batchIds), [data, month, batchIds]);
  const byDate = useMemo(() => groupByDate(items), [items]);
  const lead = (weekdayOf(`${month}-01`) - 6 + 7) % 7;
  const cells: Array<string | null> = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth(month) }, (_, i) => dayInMonth(month, i + 1))];
  const dayItems = byDate.get(selected) ?? [];
  const kinds: CalendarKind[] = ['exam', 'class', 'fee', 'holiday', 'event'];
  const batchName = (id?: string) => data.batches.find((b) => b.id === id)?.name ?? '';

  const move = (delta: number) => {
    const m = addMonths(month, delta);
    setMonth(m);
    setSelected(m === monthOf(today) ? today : `${m}-01`);
  };

  const label = (it: CalendarItem) => `${t(`calendar.kind.${it.kind}`)} · ${it.title}`;

  return (
    <>
      <Dialog open={open && !editing} onClose={onClose} title={t('calendar.title')} size="md" footer={<Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>}>
        <div className="flex items-center justify-between gap-2">
          <IconButton label={t('calendar.prev')} onClick={() => move(-1)} className="border border-line-strong">
            <IconChevronRight width={20} height={20} className="rotate-180" />
          </IconButton>
          <p className="font-display text-base font-semibold" aria-live="polite">
            {formatMonth(month, lang, banglaNumerals)}
          </p>
          <IconButton label={t('calendar.next')} onClick={() => move(1)} className="border border-line-strong">
            <IconChevronRight width={20} height={20} />
          </IconButton>
        </div>

        <div role="grid" aria-label={formatMonth(month, lang, banglaNumerals)} className="grid grid-cols-7 gap-1 text-center text-sm">
          {WEEK_ORDER.map((id) => (
            <div key={id} role="columnheader" className="py-1 text-xs font-medium text-muted">
              {WEEKDAYS.find((w) => w.id === id)![lang]}
            </div>
          ))}
          {cells.map((date, i) => {
            if (!date) return <div key={`b${i}`} role="gridcell" />;
            const list = byDate.get(date) ?? [];
            const shown = [...new Set(list.map((x) => x.kind))].slice(0, 4);
            const isSelected = date === selected;
            return (
              <button
                key={date}
                type="button"
                role="gridcell"
                aria-selected={isSelected}
                aria-label={`${d(date, { day: 'numeric', month: 'long', weekday: 'long' })}${list.length ? `, ${list.length}` : ''}`}
                onClick={() => setSelected(date)}
                className={cx(
                  'press flex min-h-12 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border text-sm',
                  isSelected ? 'border-transparent bg-brand text-brand-fg shadow-glow' : 'border-transparent hover:bg-surface-2',
                  date === today && !isSelected && 'border-[color:var(--gold-line)]',
                )}
              >
                <span className="num font-medium">{n(Number(date.slice(8)))}</span>
                <span className="flex h-2 items-center gap-0.5" aria-hidden="true">
                  {shown.map((k) => (
                    <span key={k} className={cx('block size-1.5', dotClass[k], isSelected && 'ring-1 ring-white')} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label={t('calendar.legend')}>
          {kinds.map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <span className={cx('block size-2', dotClass[k])} aria-hidden="true" />
              {t(`calendar.kind.${k}`)}
            </li>
          ))}
        </ul>

        <div className="space-y-2 rounded-2xl border border-line bg-surface-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{d(selected, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
            <Button variant="secondary" className="min-h-9 px-3" onClick={() => setEditing({ date: selected, kind: 'event', title: '' })}>
              {t('calendar.addEvent')}
            </Button>
          </div>
          {dayItems.length === 0 && <p className="text-sm text-muted">{t('calendar.empty')}</p>}
          <ul className="space-y-1.5">
            {dayItems.map((it, i) => {
              const Icon = kindIcon[it.kind];
              return (
                <li key={`${it.kind}${it.title}${i}`} className="flex items-center gap-2 text-sm">
                  <Icon width={16} height={16} className={it.kind === 'exam' ? 'text-gold' : 'text-brand-text'} />
                  <span className="min-w-0 flex-1">{label(it)}</span>
                  {it.eventId && (
                    <>
                      <IconButton label={t('common.edit')} className="size-9" onClick={() => setEditing(data.events.find((e) => e.id === it.eventId)!)}>
                        <IconPencil width={16} height={16} />
                      </IconButton>
                      <button type="button" className="press min-h-9 cursor-pointer rounded-xl px-2 text-xs font-medium text-red-fg hover:bg-red-bg" onClick={() => setDeleting(it)}>
                        {t('common.delete')}
                      </button>
                    </>
                  )}
                  {it.batchId && it.kind === 'event' && <Chip tone="muted">{batchName(it.batchId)}</Chip>}
                </li>
              );
            })}
          </ul>
        </div>
      </Dialog>

      <EventForm event={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog open={deleting !== null} title={t('calendar.deleteTitle')} confirmLabel={t('common.delete')} onClose={() => setDeleting(null)} onConfirm={() => deleting?.eventId && useData.getState().remove('events', deleting.eventId)}>
        {deleting?.title}
      </ConfirmDialog>
    </>
  );
}

function EventForm({ event, onClose }: { event: Partial<CalendarEvent> | null; onClose: () => void }) {
  const { t } = useI18n();
  const batches = useData((s) => s.batches);
  const [draft, setDraft] = useState<Partial<CalendarEvent> | null>(null);
  const [touched, setTouched] = useState(false);
  // load the draft each time the form opens
  const open = event !== null;
  if (open && draft === null) setDraft(event);
  if (!open && draft !== null) {
    setDraft(null);
    setTouched(false);
  }
  const e = draft ?? {};
  const titleError = !e.title?.trim() ? t('forms.required') : undefined;
  const dateError = !isValidISODate(e.date) ? t('forms.badDate') : undefined;

  const save = () => {
    setTouched(true);
    if (titleError || dateError) return;
    useData.getState().upsert('events', {
      id: e.id ?? newId('ev'),
      date: e.date as string,
      title: (e.title as string).trim(),
      kind: e.kind ?? 'event',
      batchId: e.batchId || undefined,
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={e.id ? t('calendar.editEvent') : t('calendar.addEvent')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={save}>{t('common.save')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t('calendar.eventTitle')} error={touched ? titleError : undefined}>
          {(id, d) => <TextInput id={id} aria-describedby={d} aria-invalid={touched && !!titleError} value={e.title ?? ''} onChange={(ev) => setDraft({ ...e, title: ev.target.value })} />}
        </Field>
        <FormGrid>
          <Field label={t('calendar.eventDate')} error={touched ? dateError : undefined}>
            {(id, d) => <TextInput id={id} type="date" aria-describedby={d} aria-invalid={touched && !!dateError} value={e.date ?? ''} onChange={(ev) => setDraft({ ...e, date: ev.target.value })} />}
          </Field>
          <Field label={t('calendar.eventKind')}>
            {(id) => (
              <Select id={id} value={e.kind ?? 'event'} onChange={(ev) => setDraft({ ...e, kind: ev.target.value as CalendarEvent['kind'] })}>
                <option value="event">{t('calendar.kind.event')}</option>
                <option value="holiday">{t('calendar.kind.holiday')}</option>
              </Select>
            )}
          </Field>
        </FormGrid>
        <Field label={t('calendar.eventBatch')}>
          {(id) => (
            <Select id={id} value={e.batchId ?? ''} onChange={(ev) => setDraft({ ...e, batchId: ev.target.value || undefined })}>
              <option value="">{t('calendar.wholeCenter')}</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </Dialog>
  );
}
