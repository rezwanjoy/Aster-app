import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { IconInbox, IconUsers } from '@/components/icons';
import { nameOf } from '@/lib/names';
import { useActiveStudent } from '@/store/hooks';
import { useSettings } from '@/store/settings';

/** Top of every student page: "Who's using Aster?" and the inbox. */
export function StudentBar() {
  const { t, n, lang } = useI18n();
  const { data, student } = useActiveStudent();
  const setActive = useSettings((s) => s.setActiveStudent);
  const unread = student ? data.messages.filter((m) => m.studentId === student.id && !m.readAt).length : 0;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <label className="relative min-w-0 flex-1 sm:flex-none">
        <span className="sr-only">{t('student.bar.who')}</span>
        <IconUsers width={18} height={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-brand-text" />
        <select
          value={student?.id ?? ''}
          onChange={(e) => setActive(e.target.value)}
          className="min-h-11 w-full cursor-pointer appearance-none rounded-2xl border border-line-strong bg-glass py-2 pr-9 pl-10 text-sm font-semibold text-fg sm:w-64"
        >
          {data.students.map((s) => (
            <option key={s.id} value={s.id}>
              {nameOf(s, lang)} · {s.className}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs text-muted">▾</span>
      </label>
      <Link
        to="/student/inbox"
        aria-label={unread ? t('student.bar.inboxUnread', { n: n(unread) }) : t('student.bar.inbox')}
        className="press relative inline-flex min-h-11 items-center gap-2 rounded-2xl border border-line-strong bg-glass px-4 text-sm font-semibold hover:bg-surface-2"
      >
        <IconInbox width={18} height={18} className="text-gold" />
        {t('student.bar.inbox')}
        {unread > 0 && <span className="num inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold text-brand-fg">{n(unread)}</span>}
      </Link>
    </div>
  );
}
