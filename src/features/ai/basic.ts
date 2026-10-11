// The calculated ("basic") insight, shown when the free AI insights are used up or Google's quota is
// out. Same shapes as the AI answers so the cards render both the same way. Built only from the
// anonymised payload, so the screen code maps letters and topic codes back exactly as it does for AI.
import type { TKey } from '@/i18n';
import type { BatchPayload, StudentPayload } from '@/lib/ai/anonymize';
import type { BatchAiResult, StudentAiResult } from '@/lib/ai/schemas';

type Say = (key: TKey, vars?: Record<string, string | number>) => string;
type Num = (value: number) => string;

const WEAK_SHARE = 40; // % of the class weak in a topic before it is worth reteaching
const STRONG = 70;
const WEAK = 50;
const LOW_ATTENDANCE = 80;
const LOW_UNDERSTANDING = 3;

export function basicBatch(p: BatchPayload, say: Say, n: Num, topic: (code: string) => string): BatchAiResult {
  const weakest = [...p.topics].filter((x) => x.weakPct > 0).sort((a, b) => b.weakPct - a.weakPct);
  const reteach = weakest.filter((x) => x.weakPct >= WEAK_SHARE).slice(0, 3);
  const first = reteach[0] ?? weakest[0];

  const parts = [
    p.attendancePct !== null ? say('ai.basic.overview', { students: n(p.studentCount), pct: n(Math.round(p.attendancePct)) }) : say('ai.basic.overviewNoAtt', { students: n(p.studentCount) }),
    first ? say('ai.basic.weak', { pct: n(first.weakPct), topic: topic(first.code) }) : say('ai.basic.noneWeak'),
  ];
  if (p.understandingAvg !== null && p.understandingAvg < LOW_UNDERSTANDING) parts.push(say('ai.basic.understanding', { avg: n(p.understandingAvg) }));

  const actions: string[] = [];
  if (first) actions.push(say('ai.basic.actReteach', { topic: topic(first.code) }));
  if (p.attention.length) actions.push(say('ai.basic.actCheck', { n: n(Math.min(p.attention.length, 3)) }));
  if (p.attendancePct !== null && p.attendancePct < LOW_ATTENDANCE) actions.push(say('ai.basic.actAttendance', { pct: n(Math.round(p.attendancePct)) }));

  return {
    summary: parts.join(' '),
    reteachTopics: (reteach.length ? reteach : first ? [first] : []).map((x) => x.code),
    students: p.attention.slice(0, 3).map((a) => ({ id: a.id, reason: say('ai.basic.needs', { reasons: a.reasons.map((r) => say(`reason.${r}` as TKey).toLowerCase()).join(', ') }) })),
    suggestedActions: actions,
  };
}

export function basicStudent(p: StudentPayload, say: Say, n: Num, topic: (code: string) => string): StudentAiResult {
  const topics = p.subjects.flatMap((s) => s.topics).filter((x) => x.mastery !== null) as { code: string; mastery: number }[];
  const strengths = topics.filter((x) => x.mastery >= STRONG).sort((a, b) => b.mastery - a.mastery).slice(0, 3);
  const weak = topics.filter((x) => x.mastery < WEAK).sort((a, b) => a.mastery - b.mastery).slice(0, 3);

  const steps = weak.slice(0, 2).map((x) => say('ai.basic.practise', { topic: topic(x.code) }));
  if (p.attendancePct !== null && p.attendancePct < LOW_ATTENDANCE) steps.push(say('ai.basic.stepAttendance', { pct: n(Math.round(p.attendancePct)) }));
  const behind = p.goals.find((g) => g.status === 'needs_work' && g.currentPercent !== null);
  if (behind) steps.push(say('ai.basic.stepGoal', { subject: behind.subject, target: n(behind.targetPercent), current: n(behind.currentPercent as number) }));
  if (!steps.length && strengths[0]) steps.push(say('ai.basic.stepKeep', { topic: topic(strengths[0].code) }));

  return {
    strengths: strengths.map((x) => ({ topic: x.code, note: say('ai.basic.strong', { pct: n(x.mastery) }) })),
    weakSpots: weak.map((x) => ({ topic: x.code, note: say('ai.basic.needsWork', { pct: n(x.mastery) }) })),
    nextSteps: steps.slice(0, 3),
    encouragement: say('ai.basic.encourage'),
  };
}
