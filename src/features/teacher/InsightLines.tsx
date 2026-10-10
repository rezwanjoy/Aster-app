import { useMemo } from 'react';
import { useI18n } from '@/i18n';
import { IconAlert, IconCalendarCheck, IconChart, IconSparkle } from '@/components/icons';
import { nameOf } from '@/lib/names';
import { teacherInsight, type TeacherFinding } from '@/lib/insights';
import { useAppData } from '@/store/hooks';

/** Turns a finding into an icon and a plain sentence (English or Bangla). */
export function useFindingText() {
  const { t, n, lang } = useI18n();
  const data = useAppData();
  const topic = (id: string) => data.topics.find((x) => x.id === id)?.name[lang] ?? id;
  const student = (id: string) => {
    const s = data.students.find((x) => x.id === id);
    return s ? nameOf(s, lang) : id;
  };
  const batch = (id: string) => {
    const b = data.batches.find((x) => x.id === id);
    return b ? nameOf(b, lang) : '';
  };
  return (f: TeacherFinding): { icon: typeof IconAlert; text: string } => {
    switch (f.type) {
      case 'reteach':
        return { icon: IconChart, text: t('insight.reteach', { pct: n(f.redPct), topic: topic(f.topicId) }) };
      case 'attention':
        return { icon: IconAlert, text: t('insight.attention', { student: student(f.studentId), reasons: f.reasons.map((r) => t(`reason.${r}`)).join(', ') }) };
      case 'attendance':
        return { icon: IconCalendarCheck, text: t('insight.attendance', { pct: n(f.pct) }) };
      case 'understanding':
        return { icon: IconSparkle, text: t('insight.understanding', { batch: batch(f.batchId), avg: n(f.avg) }) };
    }
  };
}

/** Rule-based findings as sentences. Calculated from your data, never AI. */
export function InsightLines({ batchIds, today, limit = 4, skip = 0, exclude = [] }: { batchIds: string[]; today: string; limit?: number; skip?: number; exclude?: TeacherFinding['type'][] }) {
  const { t } = useI18n();
  const data = useAppData();
  const insight = useMemo(() => teacherInsight(data, batchIds, { today }), [data, batchIds, today]);
  const sentence = useFindingText();
  const shown = insight.findings.filter((f) => !exclude.includes(f.type)).slice(skip, skip + limit);

  if (insight.findings.length === 0) {
    return <p className="flex items-center gap-2 text-sm text-muted"><IconSparkle width={16} height={16} className="text-gold" /> {t('insight.allGood')}</p>;
  }
  if (shown.length === 0) return <p className="text-sm text-muted">{t('insight.noMore')}</p>;
  return (
    <ul className="space-y-2">
      {shown.map((f, i) => {
        const { icon: Icon, text } = sentence(f);
        return (
          <li key={i} className="flex items-start gap-2.5 rounded-2xl border border-line bg-surface-2 p-3 text-sm">
            <Icon width={18} height={18} className="mt-0.5 shrink-0 text-brand-text" />
            <span>{text}</span>
          </li>
        );
      })}
    </ul>
  );
}
