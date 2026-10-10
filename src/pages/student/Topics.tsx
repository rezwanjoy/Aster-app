import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n';
import { PageHeader } from '@/components/PageHeader';
import { MasteryPill, Trend } from '@/components/dashboard';
import { Reveal } from '@/components/motion';
import { Card, MasteryBadge, cx } from '@/components/ui';
import { SubjectSwitcher, pickSubject } from '@/features/student/SubjectSwitcher';
import { TopicSheet } from '@/features/student/TopicSheet';
import { LockedCard } from '@/features/premium/LockedCard';
import { studentTopicMastery } from '@/lib/mastery';
import { studentSubjectIds } from '@/lib/scope';
import { useActiveStudent } from '@/store/hooks';

const bar = { red: 'before:bg-[#ef6b6b]', yellow: 'before:bg-[#f2c14e]', green: 'before:bg-[#4ade80]', unknown: 'before:bg-[#9a96b0]' };

export function StudentTopics() {
  const { t, n, lang } = useI18n();
  const { data, student, today } = useActiveStudent();
  const [picked, setPicked] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const subjects = useMemo(() => (student ? studentSubjectIds(data, student.id) : []), [data, student]);
  const subjectId = pickSubject(subjects, picked);
  const masteries = useMemo(
    () => (student && subjectId ? [...studentTopicMastery(data, student.id, { today, subjectIds: [subjectId] })].sort((a, b) => (a.mastery ?? 101) - (b.mastery ?? 101)) : []),
    [data, student, subjectId, today],
  );
  if (!student) return <Card className="text-center text-sm text-muted">{t('student.noStudents')}</Card>;
  const topicName = (id: string) => data.topics.find((x) => x.id === id)?.name[lang] ?? id;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('student.topics.eyebrow')} title={t('page.student.topics.title')} desc={t('page.student.topics.desc')} />
      <SubjectSwitcher studentId={student.id} value={subjectId} onChange={setPicked} />

      <Reveal i={1}>
        <div className="flex flex-wrap gap-2" aria-label={t('student.topics.legend')} role="group">
          <MasteryBadge band="red" label={`${t('mastery.red')} (<${n(50)}%)`} />
          <MasteryBadge band="yellow" label={`${t('mastery.yellow')} (${n(50)}–${n(69)}%)`} />
          <MasteryBadge band="green" label={`${t('mastery.green')} (≥${n(70)}%)`} />
        </div>
      </Reveal>

      {masteries.length === 0 && <Card className="text-center text-sm text-muted">{t('studentDetail.noTopics')}</Card>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        {masteries.map((m, i) => (
          <Reveal key={m.topicId} i={i}>
            <Card className={cx('relative h-full overflow-hidden p-0 before:absolute before:inset-y-0 before:left-0 before:w-1 sm:p-0', bar[m.band])}>
              <button type="button" onClick={() => setOpen(m.topicId)} className="block min-h-24 w-full cursor-pointer space-y-3 p-4 text-left sm:p-5" aria-label={t('student.topics.open', { topic: topicName(m.topicId) })}>
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-sm leading-snug font-semibold">{topicName(m.topicId)}</span>
                  <span className="num font-display text-2xl leading-none font-semibold tracking-[-0.03em]">{m.mastery === null ? '–' : `${n(Math.round(m.mastery))}%`}</span>
                </span>
                <span className="flex flex-wrap items-center justify-between gap-2">
                  {m.mastery === null ? <MasteryBadge band="unknown" label={t('mastery.unknown')} /> : <MasteryPill pct={Math.round(m.mastery)} />}
                  {m.trend !== 'flat' && <Trend trend={m.trend} />}
                </span>
              </button>
            </Card>
          </Reveal>
        ))}
      </div>

      <LockedCard id="practice" />

      <TopicSheet studentId={student.id} topicId={open} today={today} onClose={() => setOpen(null)} />
    </div>
  );
}
