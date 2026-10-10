import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useI18n, type TKey } from '@/i18n';
import { BrandMark, IconCheck } from '@/components/icons';
import { Button, Chip } from '@/components/ui';
import { Field, TextInput } from '@/components/forms';
import { homePath } from '@/app/nav';
import { useAppData } from '@/store/hooks';
import { useSettings } from '@/store/settings';

const EASE = [0.23, 1, 0.32, 1] as const;
const ROLES = ['teacher', 'center', 'student'] as const;
type Role = (typeof ROLES)[number];

/**
 * Sign-in screen for the demo. There are no accounts yet, so the real fields are switched off
 * (nobody should type a real password here) and one button opens the sample data.
 */
export function SignIn() {
  const { role } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const data = useAppData();
  const patchSettings = useSettings((s) => s.patchSettings);
  const [code, setCode] = useState('');

  if (!ROLES.includes(role as Role)) return <Navigate to="/home" replace />;
  const r = role as Role;
  const k = (s: string) => t(`signin.${r}.${s}` as TKey);

  const enter = () => {
    const mode = r;
    patchSettings({ welcomed: true, mode, lockedRole: r === 'student' ? 'student' : undefined, activeStudentId: data.students[0]?.id });
    navigate(homePath(mode), { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 py-8">
      <Link to="/home" className="flex w-fit items-center gap-2">
        <BrandMark size={36} />
        <span className="font-display text-xl font-semibold tracking-[-0.02em]">{t('app.name')}</span>
      </Link>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="glass space-y-5 rounded-[1.75rem] p-5 sm:p-7">
        <div className="space-y-1.5">
          <Chip tone="gold">{t('common.demoVersion')}</Chip>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">{k('title')}</h1>
          <p className="text-sm text-muted">{k('body')}</p>
        </div>

        <div className="space-y-3" aria-describedby="demo-note">
          <Field label={t('signin.id')}>{(id) => <TextInput id={id} disabled placeholder={t('signin.idHint')} />}</Field>
          <Field label={t('signin.password')}>{(id) => <TextInput id={id} type="password" disabled placeholder="••••••••" />}</Field>
        </div>
        <p id="demo-note" className="rounded-2xl border border-line bg-surface-2 p-3 text-xs text-muted">{t('signin.note')}</p>

        {r === 'student' && (
          <Field label={t('signin.code')} hint={t('signin.codeHint')}>
            {(id, d) => <TextInput id={id} aria-describedby={d} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ASTER-1234" maxLength={16} autoComplete="off" />}
          </Field>
        )}
        {r === 'center' && <p className="flex items-start gap-2 text-sm text-muted"><IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-gold" />{t('signin.center.invite')}</p>}

        <Button className="w-full" onClick={enter}>{t('signin.demo')}</Button>
        <p className="text-center text-xs text-muted">{t('signin.demoHint')}</p>
      </motion.div>

      <nav aria-label={t('signin.other')} className="flex flex-wrap items-center justify-center gap-x-4 text-sm">
        {ROLES.filter((x) => x !== r).map((x) => (
          <Link key={x} to={`/signin/${x}`} className="inline-flex min-h-11 items-center font-semibold text-brand-text hover:underline">{t(`signin.as.${x}` as TKey)}</Link>
        ))}
      </nav>
    </div>
  );
}
