import { useState } from 'react';
import { useI18n } from '@/i18n';
import { PageHeader } from '@/components/PageHeader';
import { Reveal } from '@/components/motion';
import { Button, Card, Chip, Segmented } from '@/components/ui';
import { IconPencil } from '@/components/icons';
import { ProfileForm } from '@/features/teacher/ProfileForm';
import { StudentSelfForm } from '@/features/student/StudentSelfForm';
import { SubjectManager } from '@/features/teacher/SubjectManager';
import { nameOf } from '@/lib/names';
import { studentSubjectIds } from '@/lib/scope';
import { useActiveStudent } from '@/store/hooks';
import { useSettings, type Theme } from '@/store/settings';
import type { GradingScale } from '@/types';
import { DataCard } from './DataCard';
import { useNavigate } from 'react-router-dom';
import { FeedbackCard } from '@/features/premium/FeedbackCard';
import { LockedCard } from '@/features/premium/LockedCard';
import { ReminderSettings } from '@/features/teacher/ReminderSettings';

const Avatar = ({ text }: { text: string }) => (
  <span className="font-display flex size-16 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#8a6dff] to-[#3a1fa0] text-2xl font-semibold text-white ring-2 ring-[color:var(--gold-line)]">{text.charAt(0)}</span>
);

/** Who you are, plus the app's settings (language, theme, grading) and your data. */
export function Profile() {
  const { t, n, lang } = useI18n();
  const { data, student } = useActiveStudent();
  const { mode, setLang, lang: current, theme, setTheme, banglaNumerals, setBanglaNumerals, gradingScale, setGradingScale } = useSettings();
  const navigate = useNavigate();
  const patchSettings = useSettings((s) => s.patchSettings);
  const [editTeacher, setEditTeacher] = useState(false);
  const [editStudent, setEditStudent] = useState(false);
  const [subjects, setSubjects] = useState(false);

  const teacherCard = (
    <Reveal i={1} key="teacher">
      <Card className="h-full space-y-4">
        <div className="flex items-center gap-4">
          <Avatar text={data.profile.teacherName[lang]} />
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">{t('profile.teacher')}</p>
            <h2 className="font-display truncate text-xl font-semibold tracking-[-0.02em]">{data.profile.teacherName[lang]}</h2>
            <p className="truncate text-sm text-muted">{data.profile.profession[lang]}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2"><dt className="text-xs text-muted">{t('profile.center')}</dt><dd className="font-medium">{data.profile.centerName[lang]}</dd></div>
          <div><dt className="text-xs text-muted">{t('profile.phone')}</dt><dd className="num font-medium">{data.profile.phone ?? '–'}</dd></div>
          <div><dt className="text-xs text-muted">{t('profile.teaching')}</dt><dd className="font-medium">{t('profile.counts', { b: n(data.batches.length), s: n(data.students.length) })}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setEditTeacher(true)}><IconPencil width={16} height={16} /> {t('common.edit')}</Button>
          <Button variant="secondary" onClick={() => setSubjects(true)}>{t('subjects.manage')}</Button>
        </div>
      </Card>
    </Reveal>
  );

  const studentCard = student && (
    <Reveal i={2} key="student">
      <Card className="h-full space-y-4">
        <div className="flex items-center gap-4">
          <Avatar text={nameOf(student, lang)} />
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">{t('profile.student')}</p>
            <h2 className="font-display truncate text-xl font-semibold tracking-[-0.02em]">{nameOf(student, lang)}</h2>
            <p className="truncate text-sm text-muted">{student.className}</p>
          </div>
        </div>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted">{t('profile.batches')}</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">{data.batches.filter((b) => student.batchIds.includes(b.id)).map((b) => <Chip key={b.id} tone="brand">{nameOf(b, lang)}</Chip>)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t('profile.subjects')}</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">{studentSubjectIds(data, student.id).map((id) => <Chip key={id} tone="gold">{data.subjects.find((s) => s.id === id)?.name[lang]}</Chip>)}</dd>
          </div>
          {student.guardianName && <div><dt className="text-xs text-muted">{t('profile.guardian')}</dt><dd className="font-medium">{student.guardianName}</dd></div>}
        </dl>
        <Button variant="secondary" onClick={() => setEditStudent(true)}><IconPencil width={16} height={16} /> {t('common.edit')}</Button>
      </Card>
    </Reveal>
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('profile.eyebrow')} title={t('nav.settings')} desc={t('profile.desc')} />

      <div className="grid grid-cols-1 gap-4 lg:gap-6">{mode !== 'student' ? teacherCard : studentCard}</div>

      <Reveal i={3}>
        <Card className="space-y-5">
          <h2 className="font-display text-lg font-semibold tracking-[-0.015em]">{t('profile.preferences')}</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('settings.language')}</p>
              <Segmented label={t('settings.language')} value={current} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'bn', label: 'বাংলা' }]} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('settings.theme')}</p>
              <Segmented<Theme> label={t('settings.theme')} value={theme} onChange={setTheme} options={[{ value: 'light', label: t('theme.light') }, { value: 'dark', label: t('theme.dark') }, { value: 'system', label: t('theme.system') }]} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('profile.grading')}</p>
              <Segmented<GradingScale> label={t('profile.grading')} value={gradingScale} onChange={setGradingScale} options={[{ value: 'percent', label: t('profile.gradingPercent') }, { value: 'gpa5', label: t('profile.gradingGpa') }, { value: 'letter', label: t('profile.gradingLetter') }]} />
              <p className="text-xs text-muted">{t('profile.gradingHint')}</p>
            </div>
            <label className="flex min-h-11 cursor-pointer items-start gap-3">
              <input type="checkbox" checked={banglaNumerals} onChange={(e) => setBanglaNumerals(e.target.checked)} className="mt-1 size-5 shrink-0 accent-(--brand)" />
              <span>
                <span className="block text-sm font-medium">{t('settings.numerals')}</span>
                <span className="block text-xs text-muted">{t('settings.numeralsHint')}</span>
              </span>
            </label>
          </div>
        </Card>
      </Reveal>

      <Reveal i={4}>
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold tracking-[-0.015em]">{t('profile.signOut')}</h2>
            <p className="text-sm text-muted">{t('profile.signOutHint')}</p>
          </div>
          <Button variant="secondary" onClick={() => { navigate(mode === 'student' ? '/signin/student' : '/home', { replace: true }); patchSettings({ welcomed: false, lockedRole: undefined }); }}>{t('profile.signOut')}</Button>
        </Card>
      </Reveal>
      {mode !== 'student' && <ReminderSettings />}
      {mode !== 'student' && <DataCard />}
      {mode !== 'student' && <LockedCard id="sync" />}
      {mode !== 'student' && <FeedbackCard />}

      {mode !== 'student' && <ProfileForm open={editTeacher} onClose={() => setEditTeacher(false)} />}
      {mode !== 'student' && <SubjectManager open={subjects} onClose={() => setSubjects(false)} />}
      {mode === 'student' && student && <StudentSelfForm open={editStudent} student={student} onClose={() => setEditStudent(false)} />}
    </div>
  );
}
