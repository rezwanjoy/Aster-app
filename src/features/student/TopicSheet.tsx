import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { LineChart } from '@/components/charts';
import { MasteryPill, Trend } from '@/components/dashboard';
import { IconCheck, IconClock } from '@/components/icons';
import { bandOf, masteryOf, topicSeries, trendOf } from '@/lib/mastery';
import { useAppData } from '@/store/hooks';

/** One topic in depth: marks in each exam, and what the study plan says about it. */
export function TopicSheet({ studentId, topicId, today, onClose }: { studentId: string; topicId: string | null; today: string; onClose: () => void }) {
  return topicId ? <Inner studentId={studentId} topicId={topicId} today={today} onClose={onClose} /> : null;
}

function Inner({ studentId, topicId, today, onClose }: { studentId: string; topicId: string; today: string; onClose: () => void }) {
  const { t, n, d, lang } = useI18n();
  const data = useAppData();
  const topic = data.topics.find((x) => x.id === topicId);
  const series = useMemo(() => topicSeries(data, studentId, topicId, { today }), [data, studentId, topicId, today]);
  const pcts = series.map((p) => p.pct);
  const mastery = masteryOf(pcts);
  const tasks = (data.plans.find((p) => p.studentId === studentId)?.tasks ?? []).filter((x) => x.topicId === topicId).sort((a, b) => a.date.localeCompare(b.date));
  const examName = (id: string) => {
    const a = data.assessments.find((x) => x.id === id);
    return a ? (lang === 'bn' && a.nameBn ? a.nameBn : a.name) : id;
  };
  const band = bandOf(mastery);

  return (
    <Dialog open onClose={onClose} title={topic?.name[lang] ?? ''} size="md" footer={<><Link to="/student/plan" onClick={onClose} className="press inline-flex min-h-11 items-center rounded-2xl border border-line-strong px-5 text-sm font-semibold hover:bg-surface-2">{t('student.topics.goPlan')}</Link><Button onClick={onClose}>{t('common.close')}</Button></>}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {mastery === null ? <span className="text-sm text-muted">{t('student.topics.noMarks')}</span> : <MasteryPill pct={Math.round(mastery)} />}
          {pcts.length > 1 && <Trend trend={trendOf(pcts)} />}
        </div>
        {mastery !== null && <p className="text-sm text-muted">{t(`student.topics.say.${band}` as 'student.topics.say.red')}</p>}

        {series.length >= 2 && (
          <LineChart data={series.map((p, i) => ({ label: `${t('common.testShort')}${n(i + 1)}`, value: Math.round(p.pct) }))} ariaLabel={topic?.name[lang] ?? ''} />
        )}
        {series.length > 0 && (
          <ul className="divide-y divide-line">
            {[...series].reverse().map((p) => (
              <li key={p.assessmentId} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0"><span className="block truncate font-medium">{examName(p.assessmentId)}</span><span className="block text-xs text-muted">{d(p.date)}</span></span>
                <span className="num font-semibold">{n(Math.round(p.pct))}%</span>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{t('student.topics.planSays')}</h3>
          {tasks.length === 0 ? <p className="text-sm text-muted">{t('student.topics.noTasks')}</p> : (
            <ul className="space-y-1.5">
              {tasks.slice(-6).map((x) => (
                <li key={x.id} className="flex items-center gap-2 text-sm">
                  {x.done ? <IconCheck width={16} height={16} className="text-green-fg" /> : <IconClock width={16} height={16} className="text-brand-text" />}
                  <span className="min-w-0 flex-1">{d(x.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {t(`task.${x.kind}`)}</span>
                  <span className="num text-xs text-muted">{n(x.minutes)} {t('common.min')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  );
}
