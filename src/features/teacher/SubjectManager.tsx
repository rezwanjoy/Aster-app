import { useState } from 'react';
import { useI18n } from '@/i18n';
import { Button, Card, IconButton } from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TextInput } from '@/components/forms';
import { newId } from '@/lib/ops';
import { useData } from '@/store/data';
import { useAppData } from '@/store/hooks';
import type { Subject, Topic } from '@/types';

/** Subjects and their topics (both languages). Changes are saved as you type. */
export function SubjectManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useI18n();
  const data = useAppData();
  const [deleting, setDeleting] = useState<{ kind: 'subject' | 'topic'; id: string; name: string } | null>(null);
  const store = useData.getState;

  const addSubject = () =>
    store().upsert('subjects', { id: newId('sub'), name: { en: 'New subject', bn: 'নতুন বিষয়' }, level: 'Class 10' });
  const addTopic = (s: Subject) => {
    const order = data.topics.filter((x) => x.subjectId === s.id).length;
    store().upsert('topics', { id: newId('tp'), subjectId: s.id, name: { en: 'New topic', bn: 'নতুন টপিক' }, order });
  };
  const usage = (kind: 'subject' | 'topic', id: string) =>
    kind === 'subject'
      ? data.assessments.filter((a) => a.subjectId === id).length
      : data.assessments.filter((a) => a.parts.some((p) => p.topicId === id)).length;

  return (
    <>
      <Dialog open={open && !deleting} onClose={onClose} size="lg" title={t('subjects.title')} footer={<><Button variant="secondary" onClick={addSubject}>{t('subjects.addSubject')}</Button><Button onClick={onClose}>{t('common.done')}</Button></>}>
        <p className="text-sm text-muted">{t('subjects.hint')}</p>
        <div className="space-y-4">
          {data.subjects.map((s) => {
            const topics = data.topics.filter((x) => x.subjectId === s.id).sort((a, b) => a.order - b.order);
            return (
              <Card key={s.id} className="space-y-3 p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <TextInput aria-label={t('subjects.nameEn')} value={s.name.en} onChange={(e) => store().patch('subjects', s.id, { name: { ...s.name, en: e.target.value } })} className="min-w-0 flex-1" />
                  <TextInput aria-label={t('subjects.nameBn')} value={s.name.bn} onChange={(e) => store().patch('subjects', s.id, { name: { ...s.name, bn: e.target.value } })} className="min-w-0 flex-1" />
                  <Button variant="secondary" className="text-red-fg" onClick={() => setDeleting({ kind: 'subject', id: s.id, name: s.name[lang] })}>{t('common.delete')}</Button>
                </div>
                <ul className="space-y-2">
                  {topics.map((tp: Topic) => (
                    <li key={tp.id} className="flex items-center gap-2">
                      <TextInput aria-label={t('subjects.nameEn')} value={tp.name.en} onChange={(e) => store().patch('topics', tp.id, { name: { ...tp.name, en: e.target.value } })} className="min-w-0 flex-1" />
                      <TextInput aria-label={t('subjects.nameBn')} value={tp.name.bn} onChange={(e) => store().patch('topics', tp.id, { name: { ...tp.name, bn: e.target.value } })} className="min-w-0 flex-1" />
                      <IconButton label={t('subjects.deleteTopic', { name: tp.name[lang] })} className="shrink-0 text-red-fg" onClick={() => setDeleting({ kind: 'topic', id: tp.id, name: tp.name[lang] })}>×</IconButton>
                    </li>
                  ))}
                </ul>
                <Button variant="ghost" className="text-brand-text" onClick={() => addTopic(s)}>+ {t('subjects.addTopic')}</Button>
              </Card>
            );
          })}
        </div>
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        title={t(deleting?.kind === 'subject' ? 'subjects.deleteSubject' : 'subjects.deleteTopicTitle', { name: deleting?.name ?? '' })}
        confirmLabel={t('common.delete')}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          if (deleting.kind === 'subject') store().removeSubject(deleting.id);
          else store().removeTopic(deleting.id);
        }}
      >
        {t(deleting?.kind === 'topic' ? 'subjects.topicBody' : 'subjects.deleteBody', { n: deleting ? usage(deleting.kind, deleting.id) : 0 })}
      </ConfirmDialog>
    </>
  );
}
