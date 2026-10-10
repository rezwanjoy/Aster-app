import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n, type TKey } from '@/i18n';
import { useBase } from '@/app/useBase';
import { ProgressBar } from '@/components/charts';
import { Reveal } from '@/components/motion';
import { Button, Card, Chip, type MasteryBand, MasteryBadge } from '@/components/ui';
import { IconPencil } from '@/components/icons';
import { TeacherForm } from '@/features/teacher/TeacherForm';
import { nameOf } from '@/lib/names';
import { CENTER_MAX, SOLO_MAX, teacherSummaries, tierFor, unassignedBatches, type Situation } from '@/lib/teachers';
import type { Teacher } from '@/types';
import { useAppData, useToday } from '@/store/hooks';

export const situationBand: Record<Situation, MasteryBand> = { good: 'green', ok: 'yellow', help: 'red', none: 'unknown' };

/** Centers only: each teacher with what they teach now, what they taught so far, and how their students are doing. */
export function CenterTeachers() {
  const { t, n, d, lang } = useI18n();
  const base = useBase();
  const data = useAppData();
  const today = useToday();
  const [editing, setEditing] = useState<Teacher | 'new' | null>(null);
  const rows = useMemo(() => teacherSummaries(data, { today }), [data, today]);
  const loose = unassignedBatches(data);
  const students = data.students.length;
  const tier = tierFor(students);
  const cap = tier === 'solo' ? SOLO_MAX : CENTER_MAX;
  const batchName = (id: string) => {
    const b = data.batches.find((x) => x.id === id);
    return b ? nameOf(b, lang) : '';
  };
  const topicName = (id: string) => data.topics.find((x) => x.id === id)?.name[lang] ?? id;
  const subjectNames = (ids: string[]) => ids.map((id) => data.subjects.find((s) => s.id === id)?.name[lang] ?? id).join(', ');

  return (
    <section aria-labelledby="teachers-h" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="teachers-h" className="font-display text-xl font-semibold tracking-[-0.02em]">{t('center.teachers')}</h2>
          <p className="text-sm text-muted">{t('center.teachersSub')}</p>
        </div>
        <Button onClick={() => setEditing('new')}>+ {t('center.addTeacher')}</Button>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-semibold">{t('center.sizeTitle')}</h3>
          <Chip tone="gold">{t(`center.tier.${tier}` as TKey)}</Chip>
        </div>
        <ProgressBar value={Math.min(100, (students / cap) * 100)} />
        <p className="text-sm text-muted">{tier === 'school' ? t('center.sizeSchool', { n: n(students) }) : t('center.sizeOf', { n: n(students), max: n(cap) })}</p>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 lg:gap-6">
        {rows.map((r, i) => (
          <Reveal key={r.teacher.id} i={i}>
            <Card className="h-full space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="font-display flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#8a6dff] to-[#3a1fa0] text-lg font-semibold text-white">{nameOf(r.teacher, lang).charAt(0)}</span>
                  <div className="min-w-0">
                    <h3 className="font-display truncate text-lg font-semibold tracking-[-0.015em]">{nameOf(r.teacher, lang)}</h3>
                    {r.teacher.phone && <p className="num truncate text-xs text-muted">{r.teacher.phone}</p>}
                  </div>
                </div>
                <Button variant="ghost" className="px-3" aria-label={`${t('common.edit')}: ${nameOf(r.teacher, lang)}`} onClick={() => setEditing(r.teacher)}><IconPencil width={16} height={16} /></Button>
              </div>

              {r.batchIds.length === 0 ? (
                <p className="text-sm text-muted">{t('center.noBatches')}</p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">{t('center.teachingNow')}</p>
                    <ul className="flex flex-wrap gap-1.5">
                      {r.batchIds.map((id) => (
                        <li key={id}><Link to={`${base}/batches/${id}`} className="inline-flex min-h-8 items-center rounded-full border border-line-strong bg-surface-2 px-3 text-xs font-medium hover:text-brand-text">{batchName(id)}</Link></li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted">{subjectNames(r.subjectIds)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">{t('center.taughtSoFar')}</p>
                    <p className="text-sm">{t('center.classesLogged', { n: n(r.classesTaught) })}{r.lastClass ? ` · ${t('center.lastClass', { date: d(r.lastClass) })}` : ''}</p>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-2xl border border-line bg-surface-2 p-2.5"><dt className="text-[11px] text-muted">{t('common.students')}</dt><dd className="num font-semibold">{n(r.students)}</dd></div>
                    <div className="rounded-2xl border border-line bg-surface-2 p-2.5"><dt className="text-[11px] text-muted">{t('common.mastery')}</dt><dd className="num font-semibold">{r.avgMastery === null ? '–' : `${n(Math.round(r.avgMastery))}%`}</dd></div>
                    <div className="rounded-2xl border border-line bg-surface-2 p-2.5"><dt className="text-[11px] text-muted">{t('common.attendance')}</dt><dd className="num font-semibold">{r.attendancePct === null ? '–' : `${n(r.attendancePct)}%`}</dd></div>
                  </dl>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <MasteryBadge band={situationBand[r.situation]} label={t(`situation.${r.situation}` as TKey)} />
                    {r.attention > 0 && <Chip tone="gold">{t('center.needAttention', { n: n(r.attention) })}</Chip>}
                  </div>
                  {r.weakestTopicId && <p className="text-xs text-muted">{t('center.weakest', { topic: topicName(r.weakestTopicId) })}</p>}
                </>
              )}
            </Card>
          </Reveal>
        ))}
      </div>

      {loose.length > 0 && (
        <Card className="space-y-2">
          <h3 className="font-display text-base font-semibold">{t('center.unassigned')}</h3>
          <p className="text-sm text-muted">{loose.map((b) => nameOf(b, lang)).join(' · ')}</p>
          <p className="text-xs text-muted">{t('center.unassignedHint')}</p>
        </Card>
      )}

      <TeacherForm open={editing !== null} teacher={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
    </section>
  );
}
