import { useEffect, useMemo, useRef } from 'react';
import { useI18n } from '@/i18n';
import { PageHeader } from '@/components/PageHeader';
import { Reveal } from '@/components/motion';
import { Card, Chip } from '@/components/ui';
import { nameOf } from '@/lib/names';
import { useData } from '@/store/data';
import { useActiveStudent } from '@/store/hooks';

/** Messages from the teacher, stored on this device (see the note on the page). */
export function StudentInbox() {
  const { t, d, lang } = useI18n();
  const { data, student } = useActiveStudent();
  const mine = useMemo(() => data.messages.filter((m) => m.studentId === student?.id).sort((a, b) => b.sentAt.localeCompare(a.sentAt)), [data.messages, student]);
  // remember which ones were new when the page opened, then mark them read
  const newIds = useRef<Set<string>>(new Set());
  const seenFor = useRef<string | null>(null);
  if (student && seenFor.current !== student.id) {
    seenFor.current = student.id;
    newIds.current = new Set(mine.filter((m) => !m.readAt).map((m) => m.id));
  }
  useEffect(() => {
    if (student && mine.some((m) => !m.readAt)) useData.getState().markMessagesRead(student.id);
  }, [student, mine]);

  if (!student) return <Card className="text-center text-sm text-muted">{t('student.noStudents')}</Card>;
  const batchName = (id: string) => {
    const b = data.batches.find((x) => x.id === id);
    return b ? nameOf(b, lang) : '';
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('student.inbox.eyebrow')} title={t('student.inbox.title')} desc={t('student.inbox.desc')} />
      {mine.length === 0 && <Card className="text-center text-sm text-muted">{t('student.inbox.empty')}</Card>}
      <ul className="space-y-3">
        {mine.map((m, i) => (
          <Reveal key={m.id} i={i}>
            <li>
              <Card className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span>{data.profile.teacherName[lang]} · {batchName(m.batchId)}</span>
                  <span className="flex items-center gap-2">{newIds.current.has(m.id) && <Chip tone="gold">{t('student.inbox.new')}</Chip>}{d(m.sentAt.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <p className="text-sm leading-relaxed">{m.body}</p>
              </Card>
            </li>
          </Reveal>
        ))}
      </ul>
      <p className="text-xs text-muted">{t('student.inbox.note')}</p>
    </div>
  );
}
