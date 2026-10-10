import { useI18n } from '@/i18n';
import { Chip } from '@/components/ui';
import { IconClock, IconUsers } from '@/components/icons';
import { WEEKDAYS } from '@/data/presets';
import { nextClass } from '@/lib/batch';
import { diffDays } from '@/lib/dates';
import { nameOf } from '@/lib/names';
import type { AppData } from '@/types';

/** Who teaches this and where: coaching center, teacher, batch, subject and schedule. */
export function ClassInfo({ data, studentId, batchId, subjectId, today }: { data: AppData; studentId: string; batchId?: string; subjectId?: string; today: string }) {
  const { t, n, d, time, lang } = useI18n();
  const center = data.profile.centerName[lang];
  const teacher = data.profile.teacherName[lang];
  const student = data.students.find((s) => s.id === studentId);
  const batch = data.batches.find((b) => b.id === batchId);
  const subject = data.subjects.find((s) => s.id === subjectId);

  if (!batch || !subject) {
    const count = student?.batchIds.reduce((sum, id) => sum + (data.batches.find((b) => b.id === id)?.subjectIds.length ?? 0), 0) ?? 0;
    return (
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-line bg-surface-2 p-4 text-sm">
        <Item label={t('student.class.coaching')} value={center} />
        <Item label={t('student.class.teacher')} value={teacher} />
        <Chip tone="brand"><IconUsers width={13} height={13} />{t('student.class.count', { n: n(count) })}</Chip>
      </div>
    );
  }

  const next = nextClass(data, batch.id, today);
  const when = next
    ? `${diffDays(next.date, today) === 0 ? t('common.today') : diffDays(next.date, today) === 1 ? t('common.tomorrow') : d(next.date, { weekday: 'short', day: 'numeric', month: 'short' })}${next.time ? `, ${time(next.time)}` : ''}`
    : '–';
  const days = batch.classDays.map((id) => WEEKDAYS.find((w) => w.id === id)![lang]).join(' · ');

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl border border-line bg-surface-2 p-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
      <Item label={t('student.class.subject')} value={subject.name[lang]} />
      <Item label={t('student.class.batch')} value={nameOf(batch, lang)} />
      <Item label={t('student.class.teacher')} value={teacher} />
      <Item label={t('student.class.coaching')} value={center} />
      <Item label={t('student.class.days')} value={days || '–'} />
      <div>
        <p className="text-xs text-muted">{t('student.class.next')}</p>
        <p className="mt-0.5 flex items-center gap-1 font-medium"><IconClock width={14} height={14} className="text-gold" />{when}</p>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
