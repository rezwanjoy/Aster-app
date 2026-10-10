import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n';
import { Button, cx } from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { Field, FormGrid, Select, TextInput, ToggleChip } from '@/components/forms';
import { IconCheck, IconClock, IconAlert } from '@/components/icons';
import { isValidISODate } from '@/lib/dates';
import { newId } from '@/lib/ops';
import { nameOf } from '@/lib/names';
import { useData } from '@/store/data';
import { useAppData } from '@/store/hooks';
import type { AttendanceStatus, ClassSession } from '@/types';

type Props = {
  open: boolean;
  onClose: () => void;
  /** batch to start with */
  batchId?: string;
  /** editing an existing class */
  session?: ClassSession | null;
  /** topics to pre-select (e.g. a revision class) */
  topicIds?: string[];
  today: string;
};

const NEXT: Record<AttendanceStatus, AttendanceStatus> = { present: 'absent', absent: 'late', late: 'present' };

/** "Log class (fast)": batch → date → topics → understanding → homework → attendance → Save (brief §10.1.3). */
export function LogClassSheet(props: Props) {
  return props.open ? <Inner {...props} /> : null;
}

function Inner({ onClose, batchId, session, today, topicIds: initialTopics }: Props) {
  const { t, lang, n } = useI18n();
  const data = useAppData();
  const [bId, setBId] = useState(session?.batchId ?? batchId ?? data.batches[0]?.id ?? '');
  const [date, setDate] = useState(session?.date ?? today);
  const [topicIds, setTopicIds] = useState<string[]>(session?.topicIds ?? initialTopics ?? []);
  const [understanding, setUnderstanding] = useState<ClassSession['understanding']>(session?.understanding ?? 4);
  const [homework, setHomework] = useState(session?.homework ?? '');
  const [notes, setNotes] = useState(session?.notes ?? '');
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(session?.attendance ?? {});
  const [touched, setTouched] = useState(false);

  const batch = data.batches.find((b) => b.id === bId);
  const members = useMemo(() => data.students.filter((s) => s.batchIds.includes(bId)), [data.students, bId]);
  const topics = useMemo(() => data.topics.filter((tp) => batch?.subjectIds.includes(tp.subjectId)), [data.topics, batch]);
  const statusOf = (id: string): AttendanceStatus => attendance[id] ?? 'present'; // everyone present by default
  const counts = members.reduce((c, s) => ({ ...c, [statusOf(s.id)]: c[statusOf(s.id)] + 1 }), { present: 0, absent: 0, late: 0 } as Record<AttendanceStatus, number>);

  const errors = {
    batch: !batch ? t('forms.required') : undefined,
    date: !isValidISODate(date) ? t('forms.badDate') : undefined,
    topics: topicIds.length === 0 ? t('logClass.pickTopic') : undefined,
  };

  const changeBatch = (id: string) => {
    setBId(id);
    setTopicIds([]);
    setAttendance({});
  };

  const save = () => {
    setTouched(true);
    if (errors.batch || errors.date || errors.topics) return;
    useData.getState().upsert('sessions', {
      id: session?.id ?? newId('c'),
      batchId: bId,
      date,
      topicIds,
      understanding,
      homework: homework.trim() || undefined,
      notes: notes.trim() || undefined,
      attendance: Object.fromEntries(members.map((s) => [s.id, statusOf(s.id)])),
    });
    onClose();
  };

  const icon = { present: IconCheck, absent: IconAlert, late: IconClock };
  const tone = { present: 'bg-green-bg text-green-fg', absent: 'bg-red-bg text-red-fg', late: 'bg-yellow-bg text-yellow-fg' };

  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      title={session ? t('logClass.editTitle') : t('logClass.title')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={save}>{t('common.save')}</Button>
        </>
      }
    >
      <div className="space-y-5">
        <FormGrid>
          <Field label={t('logClass.batch')} error={touched ? errors.batch : undefined}>
            {(id) => (
              <Select id={id} value={bId} onChange={(e) => changeBatch(e.target.value)}>
                {data.batches.map((b) => (
                  <option key={b.id} value={b.id}>{nameOf(b, lang)}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('logClass.date')} error={touched ? errors.date : undefined}>
            {(id, d) => <TextInput id={id} type="date" aria-describedby={d} value={date} onChange={(e) => setDate(e.target.value)} />}
          </Field>
        </FormGrid>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t('logClass.topics')}</legend>
          <div className="flex flex-wrap gap-2">
            {topics.map((tp) => (
              <ToggleChip key={tp.id} on={topicIds.includes(tp.id)} onClick={() => setTopicIds((cur) => (cur.includes(tp.id) ? cur.filter((x) => x !== tp.id) : [...cur, tp.id]))}>
                {tp.name[lang]}
              </ToggleChip>
            ))}
          </div>
          {touched && errors.topics && <p className="text-xs font-medium text-red-fg">{errors.topics}</p>}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t('logClass.understanding')}</legend>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={understanding === v}
                aria-label={t('logClass.understandingN', { n: n(v) })}
                onClick={() => setUnderstanding(v)}
                className={cx('press num min-h-11 flex-1 cursor-pointer rounded-2xl border text-sm font-semibold', understanding === v ? 'border-transparent bg-brand text-brand-fg shadow-glow' : 'border-line-strong bg-surface-2 text-muted hover:text-fg')}
              >
                {n(v)}
              </button>
            ))}
          </div>
          <p className="flex justify-between text-xs text-muted"><span>{t('logClass.low')}</span><span>{t('logClass.high')}</span></p>
        </fieldset>

        <FormGrid>
          <Field label={t('logClass.homework')}>{(id) => <TextInput id={id} value={homework} onChange={(e) => setHomework(e.target.value)} />}</Field>
          <Field label={t('logClass.notes')}>{(id) => <TextInput id={id} value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
        </FormGrid>

        <fieldset className="space-y-2">
          <legend className="flex w-full items-center justify-between gap-2 text-sm font-medium">
            <span>{t('logClass.attendance')}</span>
            <span className="num text-xs font-normal text-muted" aria-live="polite">
              {t('logClass.counts', { p: n(counts.present), l: n(counts.late), a: n(counts.absent) })}
            </span>
          </legend>
          <p className="text-xs text-muted">{t('logClass.attendanceHint')}</p>
          {members.length === 0 && <p className="text-sm text-muted">{t('logClass.noStudents')}</p>}
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {members.map((s) => {
              const st = statusOf(s.id);
              const Icon = icon[st];
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setAttendance((cur) => ({ ...cur, [s.id]: NEXT[statusOf(s.id)] }))}
                    className={cx('press flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-2xl border border-line px-3 text-left text-sm', st !== 'present' && 'border-line-strong')}
                  >
                    <span className="min-w-0 truncate">{lang === 'bn' && s.nameBn ? s.nameBn : s.name}</span>
                    <span className={cx('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', tone[st])}>
                      <Icon width={13} height={13} strokeWidth={2.4} />
                      {t(`logClass.${st}`)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      </div>
    </Dialog>
  );
}
