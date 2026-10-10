import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Field, FormGrid, Select, TextInput } from '@/components/forms';
import { isValidISODate } from '@/lib/dates';
import { studentSubjectIds } from '@/lib/scope';
import { deleteTask, newOwnTask, saveTask } from '@/lib/tasks';
import { useData } from '@/store/data';
import { useAppData } from '@/store/hooks';
import type { PlanTask } from '@/types';

type Props = { open: boolean; studentId: string; task: PlanTask | null; today: string; onClose: () => void };

/** Add your own task, or change the day/minutes of any task (and the title of your own). */
export function TaskForm(props: Props) {
  return props.open ? <Inner {...props} /> : null;
}

function Inner({ studentId, task, today, onClose }: Props) {
  const { t, n, lang } = useI18n();
  const data = useAppData();
  const isOwn = !task || task.kind === 'custom';
  const [title, setTitle] = useState(task?.title ?? '');
  const [topicId, setTopicId] = useState(task?.topicId ?? '');
  const [date, setDate] = useState(task?.date ?? today);
  const [minutes, setMinutes] = useState(String(task?.minutes ?? 15));
  const [touched, setTouched] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const topics = useMemo(() => {
    const subjects = studentSubjectIds(data, studentId);
    return data.topics.filter((x) => subjects.includes(x.subjectId));
  }, [data, studentId]);
  const subjectName = (id: string) => data.subjects.find((s) => s.id === id)?.name[lang] ?? '';
  const topicName = (id?: string) => (id ? (data.topics.find((x) => x.id === id)?.name[lang] ?? '') : '');

  const mins = Number(minutes);
  const errors = {
    title: isOwn && !title.trim() ? t('forms.required') : undefined,
    date: !isValidISODate(date) ? t('forms.badDate') : undefined,
    minutes: !Number.isFinite(mins) || mins < 1 || mins > 240 ? t('taskForm.badMinutes') : undefined,
  };

  const save = () => {
    setTouched(true);
    if (errors.title || errors.date || errors.minutes) return;
    const next: PlanTask = task
      ? { ...task, date, minutes: mins, ...(isOwn ? { title: title.trim(), topicId: topicId || undefined } : {}) }
      : newOwnTask({ date, title, minutes: mins, topicId: topicId || undefined });
    useData.getState().apply((d) => saveTask(d, studentId, next, today));
    onClose();
  };

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        title={task ? t('taskForm.editTitle') : t('taskForm.addTitle')}
        footer={
          <>
            {task && <Button variant="secondary" className="mr-auto text-red-fg" onClick={() => setDeleting(true)}>{t('common.delete')}</Button>}
            <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
            <Button onClick={save}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {isOwn ? (
            <Field label={t('taskForm.title')} error={touched ? errors.title : undefined}>
              {(id, d) => <TextInput id={id} aria-describedby={d} aria-invalid={touched && !!errors.title} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('taskForm.titleHint')} autoComplete="off" />}
            </Field>
          ) : (
            <p className="rounded-2xl border border-line bg-surface-2 p-3 text-sm">
              {t(`task.${task!.kind}`)} · {topicName(task!.topicId)} <span className="block text-xs text-muted">{t('taskForm.plannedNote')}</span>
            </p>
          )}
          {isOwn && (
            <Field label={t('taskForm.topic')}>
              {(id) => (
                <Select id={id} value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                  <option value="">{t('taskForm.noTopic')}</option>
                  {topics.map((x) => <option key={x.id} value={x.id}>{subjectName(x.subjectId)} · {x.name[lang]}</option>)}
                </Select>
              )}
            </Field>
          )}
          <FormGrid>
            <Field label={t('taskForm.date')} error={touched ? errors.date : undefined}>
              {(id, d) => <TextInput id={id} type="date" aria-describedby={d} value={date} onChange={(e) => setDate(e.target.value)} />}
            </Field>
            <Field label={t('taskForm.minutes')} error={touched ? errors.minutes : undefined}>
              {(id, d) => <TextInput id={id} inputMode="numeric" aria-describedby={d} aria-invalid={touched && !!errors.minutes} value={minutes} onChange={(e) => setMinutes(e.target.value)} />}
            </Field>
          </FormGrid>
          <p className="text-xs text-muted">{t('taskForm.perDay', { n: n(data.students.find((s) => s.id === studentId)?.dailyMinutes ?? 15) })}</p>
        </div>
      </Dialog>
      <ConfirmDialog open={deleting} title={t('taskForm.deleteTitle')} confirmLabel={t('common.delete')} onClose={() => setDeleting(false)} onConfirm={() => { if (task) { useData.getState().apply((d) => deleteTask(d, studentId, task.id)); onClose(); } }}>
        {task?.title ?? `${t(`task.${task?.kind ?? 'learn'}`)} · ${topicName(task?.topicId)}`}
      </ConfirmDialog>
    </>
  );
}

