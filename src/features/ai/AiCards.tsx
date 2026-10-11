import { useCallback, useMemo } from 'react';
import { useI18n, type TKey } from '@/i18n';
import { Button, Card, Chip } from '@/components/ui';
import { IconSparkle } from '@/components/icons';
import { buildBatchInput, buildStudentInput, type TopicRef } from '@/lib/ai/anonymize';
import { batchPrompt, studentPrompt } from '@/lib/ai/prompts';
import { parseBatchResult, parseStudentResult, topicNameOf, type BatchAiResult, type StudentAiResult } from '@/lib/ai/schemas';
import { useAppData } from '@/store/hooks';
import { useSettings } from '@/store/settings';
import { basicBatch, basicStudent } from './basic';
import { useAi, type AiState } from './useAi';

type Ai = ReturnType<typeof useAi<never>>;

/** Shared frame: header, status line, generate button, free-plan notice, and errors. */
function Shell({ ai, children, footer }: { ai: Omit<Ai, 'state'> & { state: AiState<unknown> }; children: React.ReactNode; footer: React.ReactNode }) {
  const { t, n } = useI18n();
  const mode = useSettings((s) => s.mode);
  const { state, ready, consent, limited, used, freeLimit } = ai;
  if (mode === 'student') return null;
  const calculated = state.status === 'done' && state.source === 'basic';

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gold-soft text-gold"><IconSparkle width={20} height={20} /></span>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-[-0.015em]">{calculated ? t('ai.titleBasic') : t('ai.title')}</h2>
            <p className="text-xs text-muted">{calculated ? t('ai.basicNote') : t('ai.privacy')}</p>
          </div>
        </div>
        <Chip tone="muted">{t('ai.usage', { used: n(used), limit: n(freeLimit) })}</Chip>
      </div>

      {!ready ? (
        <div className="space-y-3 text-sm">
          <p className="font-semibold">{t('ai.consent.title')}</p>
          <p className="text-muted">{t('ai.consent.sent')}</p>
          <p className="text-muted">{t('ai.consent.never')}</p>
          <p className="text-muted">{t('ai.consent.google')}</p>
          <Button onClick={consent}>{t('ai.consent.agree')}</Button>
        </div>
      ) : (
        <>
          <div aria-live="polite" className="space-y-4">
            {state.status === 'done' && children}
            {state.status === 'done' && state.cached && state.source === 'ai' && <p className="text-xs text-muted">{t('ai.saved')}</p>}
          </div>
          {state.status === 'loading' && <p role="status" className="animate-pulse text-sm text-muted">{t('ai.loading')}</p>}
          {state.status === 'error' && <p role="alert" className="rounded-2xl border border-line bg-surface-2 p-3 text-sm text-red-fg">{t(`ai.err.${state.code}` as TKey)}</p>}
          {limited && state.status !== 'done' && state.status !== 'loading' && (
            <div className="rounded-2xl border border-dashed border-[color:var(--gold-line)] p-4 text-sm">
              <p className="font-semibold">{t('ai.limit.title')}</p>
              <p className="mt-1 text-muted">{t('ai.limit.body', { limit: n(freeLimit) })}</p>
            </div>
          )}
          {footer}
        </>
      )}
    </Card>
  );
}

function Actions({ ai, label }: { ai: ReturnType<typeof useAi<never>>; label: string }) {
  const { t } = useI18n();
  if (!ai.ready) return null;
  const busy = ai.state.status === 'loading';
  const done = ai.state.status === 'done';
  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled={busy} onClick={() => ai.generate()}>{done ? t('ai.regenerate') : label}</Button>
      {ai.limited && <Button variant="secondary" disabled={busy} onClick={() => ai.generate({ force: true })}>{t('ai.limit.anyway')}</Button>}
    </div>
  );
}

const List = ({ items }: { items: string[] }) => (
  <ul className="list-disc space-y-1 ps-5 text-sm marker:text-gold">{items.map((x) => <li key={x}>{x}</li>)}</ul>
);
const Label = ({ children }: { children: React.ReactNode }) => <p className="mb-1.5 text-xs font-semibold tracking-[0.14em] text-gold uppercase">{children}</p>;

/** AI insight for a class or for everything in the current batch filter. */
export function BatchAiCard({ batchIds, today }: { batchIds: string[]; today: string }) {
  const { t, n, lang } = useI18n();
  const data = useAppData();
  const localTopic = useCallback((refs: TopicRef[], c: string) => {
    const en = topicNameOf(refs, c);
    return data.topics.find((x) => x.name.en === en)?.name[lang] ?? en ?? c;
  }, [data.topics, lang]);
  const input = useMemo(() => buildBatchInput(data, batchIds, { today }), [data, batchIds, today]);
  const request = useMemo(
    () => (input.payload.topics.length ? { kind: 'batch' as const, payload: input.payload, spec: batchPrompt(input.payload, lang), accept: (raw: unknown) => parseBatchResult(raw, input.payload), basic: () => basicBatch(input.payload, t, n, (c) => localTopic(input.topicRefs, c)) } : null),
    [input, lang, t, n, localTopic],
  );
  const ai = useAi<BatchAiResult>(request);
  const r = ai.state.status === 'done' ? ai.state.result : null;
  const studentOf = (letter: string) => {
    const s = data.students.find((x) => x.id === input.aliases[letter]);
    return s ? (lang === 'bn' && s.nameBn ? s.nameBn : s.name) : null;
  };

  return (
    <Shell ai={ai as never} footer={request ? <Actions ai={ai as never} label={t('ai.generate')} /> : <p className="text-sm text-muted">{t('ai.noData')}</p>}>
      {r && (
        <>
          <p className="text-sm leading-relaxed">{r.summary}</p>
          {r.reteachTopics.length > 0 && (
            <div>
              <Label>{t('ai.reteach')}</Label>
              <div className="flex flex-wrap gap-1.5">{r.reteachTopics.map((c) => <Chip key={c} tone="gold">{data.topics.find((x) => x.name.en === topicNameOf(input.topicRefs, c))?.name[lang] ?? topicNameOf(input.topicRefs, c)}</Chip>)}</div>
            </div>
          )}
          {r.students.length > 0 && (
            <div>
              <Label>{t('ai.students')}</Label>
              <ul className="space-y-1 text-sm">{r.students.map((s) => studentOf(s.id) && <li key={s.id}><strong className="font-semibold">{studentOf(s.id)}</strong> · {s.reason}</li>)}</ul>
            </div>
          )}
          {r.suggestedActions.length > 0 && <div><Label>{t('ai.actions')}</Label><List items={r.suggestedActions} /></div>}
        </>
      )}
    </Shell>
  );
}

/** AI insight for one student, written for the teacher to share. */
export function StudentAiCard({ studentId, subjectId, today }: { studentId: string; subjectId?: string; today: string }) {
  const { t, n, lang } = useI18n();
  const data = useAppData();
  const localTopic = useCallback((refs: TopicRef[], c: string) => {
    const en = topicNameOf(refs, c);
    return data.topics.find((x) => x.name.en === en)?.name[lang] ?? en ?? c;
  }, [data.topics, lang]);
  const input = useMemo(() => buildStudentInput(data, studentId, { today }, { subjectId }), [data, studentId, subjectId, today]);
  const request = useMemo(
    () => (input.topicRefs.length ? { kind: 'student' as const, payload: input.payload, spec: studentPrompt(input.payload, lang), accept: (raw: unknown) => parseStudentResult(raw, input.payload), basic: () => basicStudent(input.payload, t, n, (c) => localTopic(input.topicRefs, c)) } : null),
    [input, lang, t, n, localTopic],
  );
  const ai = useAi<StudentAiResult>(request);
  const r = ai.state.status === 'done' ? ai.state.result : null;
  const topic = (code: string) => {
    const en = topicNameOf(input.topicRefs, code);
    return data.topics.find((x) => x.name.en === en)?.name[lang] ?? en ?? code;
  };

  return (
    <Shell ai={ai as never} footer={request ? <Actions ai={ai as never} label={t('ai.generate')} /> : <p className="text-sm text-muted">{t('ai.noData')}</p>}>
      {r && (
        <>
          {r.strengths.length > 0 && <div><Label>{t('ai.strengths')}</Label><List items={r.strengths.map((s) => `${topic(s.topic)}: ${s.note}`)} /></div>}
          {r.weakSpots.length > 0 && <div><Label>{t('ai.weak')}</Label><List items={r.weakSpots.map((s) => `${topic(s.topic)}: ${s.note}`)} /></div>}
          {r.nextSteps.length > 0 && <div><Label>{t('ai.nextSteps')}</Label><List items={r.nextSteps} /></div>}
          <p className="rounded-2xl bg-surface-2 p-3 text-sm italic">{r.encouragement}</p>
        </>
      )}
    </Shell>
  );
}
