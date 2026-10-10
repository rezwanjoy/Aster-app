import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBase } from '@/app/useBase';
import { useI18n } from '@/i18n';
import { PageHeader } from '@/components/PageHeader';
import { ProgressBar, Ring } from '@/components/charts';
import { Reveal } from '@/components/motion';
import { Button, Card, Chip } from '@/components/ui';
import { IconCalendarCheck, IconChevronRight, IconClock, IconUsers } from '@/components/icons';
import { BatchForm } from '@/features/teacher/BatchForm';
import { CenterTeachers } from '@/features/center/CenterTeachers';
import { LockedCard } from '@/features/premium/LockedCard';
import { TermForm } from '@/features/teacher/TermForm';
import { nameOf } from '@/lib/names';
import { nextClass, scopeSummary } from '@/lib/batch';
import { diffDays } from '@/lib/dates';
import { useAppData, useToday } from '@/store/hooks';
import type { Term } from '@/types';

export function TeacherBatches() {
  const { t, n, d, time, lang } = useI18n();
  const base = useBase();
  const isCenter = base === '/center';
  const data = useAppData();
  const today = useToday();
  const [adding, setAdding] = useState(false);
  const [term, setTerm] = useState<Term | 'new' | null>(null);
  const current = data.terms.find((x) => x.id === data.currentTermId);

  const cards = useMemo(() => data.batches.map((b) => ({ b, s: scopeSummary(data, [b.id], { today }), next: nextClass(data, b.id, today) })), [data, today]);
  const total = current ? diffDays(current.endDate, current.startDate) + 1 : 0;
  const day = current ? Math.max(0, Math.min(total, diffDays(today, current.startDate) + 1)) : 0;
  const status = !current ? '' : today < current.startDate ? t('batches.termNotStarted') : today > current.endDate ? t('batches.termEnded') : t('batches.termRunning', { day: n(day), total: n(total) });
  const teacher = (id?: string) => {
    const x = data.teachers.find((tt) => tt.id === id);
    return x ? nameOf(x, lang) : '';
  };
  const when = (date: string, tm?: string) => {
    const diff = diffDays(date, today);
    const label = diff === 0 ? t('common.today') : diff === 1 ? t('common.tomorrow') : d(date, { weekday: 'short', day: 'numeric', month: 'short' });
    return tm ? `${label}, ${time(tm)}` : label;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('teacher.batches.eyebrow')}
        title={t('page.teacher.batches.title')}
        desc={t('page.teacher.batches.desc')}
        aside={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setAdding(true)}>+ {t('batches.add')}</Button>
          </div>
        }
      />

      {current && (
        <Reveal i={1}>
          <Card className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">{t('batches.currentTerm')}</p>
                <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">{lang === 'bn' && current.nameBn ? current.nameBn : current.name}</h2>
                <p className="text-sm text-muted">{d(current.startDate)} – {d(current.endDate)} · {status}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setTerm(current)}>{t('common.edit')}</Button>
                <Button variant="secondary" onClick={() => setTerm('new')}>{t('batches.newTerm')}</Button>
              </div>
            </div>
            <ProgressBar value={total ? (day / total) * 100 : 0} />
            <p className="text-sm text-muted">{t('batches.termBrief', { batches: n(data.batches.length), students: n(data.students.length) })}</p>
          </Card>
        </Reveal>
      )}

      {cards.length === 0 && (
        <Card className="space-y-3 text-center">
          <p className="font-display text-lg font-semibold">{t('teacher.empty.title')}</p>
          <p className="mx-auto max-w-md text-sm text-muted">{t('teacher.empty.body')}</p>
          <div><Button onClick={() => setAdding(true)}>{t('batches.add')}</Button></div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 lg:gap-6">
        {cards.map(({ b, s, next }, i) => (
          <Reveal key={b.id} i={i + 2}>
            <Card className="h-full space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-lg leading-snug font-semibold tracking-[-0.015em]">
                    <Link to={`${base}/batches/${b.id}`} className="after:absolute after:inset-0 after:rounded-[1.75rem] focus-visible:outline-offset-4">
                      {lang === 'bn' && b.nameBn ? b.nameBn : b.name}
                    </Link>
                  </h2>
                  <p className="mt-0.5 text-sm text-muted">{b.level}{isCenter && teacher(b.teacherId) && ` · ${teacher(b.teacherId)}`}</p>
                </div>
                <Ring value={Math.round(s.avgMastery ?? 0)} size={84} stroke={8} label={s.avgMastery === null ? '–' : `${n(Math.round(s.avgMastery))}%`} sub={t('common.mastery')} />
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 p-3">
                  <IconUsers width={18} height={18} className="text-brand-text" />
                  <div><dt className="text-xs text-muted">{t('common.students')}</dt><dd className="num font-semibold">{n(s.students)}</dd></div>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 p-3">
                  <IconCalendarCheck width={18} height={18} className="text-brand-text" />
                  <div><dt className="text-xs text-muted">{t('common.attendance')}</dt><dd className="num font-semibold">{s.attendancePct === null ? '–' : `${n(s.attendancePct)}%`}</dd></div>
                </div>
              </dl>
              <div className="flex items-center justify-between gap-2">
                {next ? (
                  <Chip tone="gold"><IconClock width={13} height={13} />{t('teacher.batches.next')}: {when(next.date, next.time)}</Chip>
                ) : <Chip tone="muted">{t('batches.noSchedule')}</Chip>}
                <IconChevronRight width={18} height={18} className="text-muted" />
              </div>
            </Card>
          </Reveal>
        ))}
      </div>

      {isCenter ? <CenterTeachers /> : null}
      {isCenter && <LockedCard id="school" />}

      <BatchForm open={adding} batch={null} onClose={() => setAdding(false)} />
      <TermForm open={term !== null} term={term === 'new' ? null : term} onClose={() => setTerm(null)} />
    </div>
  );
}
