import { useMemo } from 'react';
import { useI18n, type TKey } from '@/i18n';
import { Section } from '@/components/dashboard';
import { MasteryBadge } from '@/components/ui';
import { situationBand } from './CenterTeachers';
import { nameOf } from '@/lib/names';
import { classesLogged, situationOf } from '@/lib/teachers';
import { useAppData } from '@/store/hooks';
import type { Batch } from '@/types';

/** On a batch page: who teaches it, how many classes so far, and how it is going in plain words. */
export function BatchTeacher({ batch, mastery, attendance, today }: { batch: Batch; mastery: number | null; attendance: number | null; today: string }) {
  const { t, n, d, lang } = useI18n();
  const data = useAppData();
  const teacher = data.teachers.find((x) => x.id === batch.teacherId);
  const logged = useMemo(() => classesLogged(data, [batch.id], today), [data, batch.id, today]);
  const situation = situationOf(mastery, attendance);

  return (
    <Section title={t('batchTeacher.title')} i={3}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold tracking-[-0.015em]">{teacher ? nameOf(teacher, lang) : t('batchTeacher.none')}</p>
          <p className="text-sm text-muted">
            {t('center.classesLogged', { n: n(logged.count) })}
            {logged.last ? ` · ${t('center.lastClass', { date: d(logged.last) })}` : ''}
          </p>
        </div>
        <MasteryBadge band={situationBand[situation]} label={t(`situation.${situation}` as TKey)} />
      </div>
      <p className="mt-3 text-sm">{t(`situationText.${situation}` as TKey)}</p>
    </Section>
  );
}
