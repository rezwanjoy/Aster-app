import { useI18n } from '@/i18n';
import { ToggleChip } from '@/components/forms';
import { nameOf } from '@/lib/names';
import { studentSubjectIds } from '@/lib/scope';
import { useAppData } from '@/store/hooks';

/** Pick which subject a student page shows, with the class and batch names underneath. */
export function SubjectSwitcher({ studentId, value, onChange }: { studentId: string; value: string | undefined; onChange: (id: string) => void }) {
  const { t, lang } = useI18n();
  const data = useAppData();
  const student = data.students.find((s) => s.id === studentId);
  const subjectIds = studentSubjectIds(data, studentId);
  const batches = data.batches.filter((b) => student?.batchIds.includes(b.id) && value && b.subjectIds.includes(value));
  if (subjectIds.length === 0) return <p className="text-sm text-muted">{t('student.noSubjects')}</p>;

  return (
    <div className="space-y-2">
      {subjectIds.length > 1 && (
        <div role="group" aria-label={t('studentDetail.subject')} className="flex flex-wrap gap-2">
          {subjectIds.map((id) => (
            <ToggleChip key={id} on={id === value} onClick={() => onChange(id)}>
              {data.subjects.find((s) => s.id === id)?.name[lang] ?? id}
            </ToggleChip>
          ))}
        </div>
      )}
      <p className="text-sm text-muted">
        {data.subjects.find((s) => s.id === value)?.name[lang]} · {student?.className}
        {batches.length > 0 && ` · ${batches.map((b) => nameOf(b, lang)).join(', ')}`}
        {` · ${data.profile.teacherName[lang]} · ${data.profile.centerName[lang]}`}
      </p>
    </div>
  );
}

/** The chosen subject, or the first one the student studies. */
export const pickSubject = (subjectIds: string[], picked: string | null): string | undefined =>
  picked && subjectIds.includes(picked) ? picked : subjectIds[0];
