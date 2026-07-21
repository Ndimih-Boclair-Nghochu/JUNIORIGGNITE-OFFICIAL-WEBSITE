import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, KeyRound, CheckCircle2, ShieldQuestion } from 'lucide-react'
import { Modal } from './Modal'

/**
 * Offline password recovery for the administrator.
 *
 * The device has no internet or email, so ownership is proved by answering the
 * security question chosen during setup. The main process throttles repeated
 * wrong answers, so brute-forcing is impractical.
 */
export function ForgotPasswordModal({ onClose }: { onClose: () => void }): JSX.Element {
  const { t } = useTranslation()
  const [stage, setStage] = useState<'username' | 'answer' | 'done'>('username')
  const [username, setUsername] = useState('')
  const [question, setQuestion] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function lookupQuestion(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await window.api.auth.recoveryQuestion({ username: username.trim() })
    setBusy(false)
    if (!res.ok) return setError(res.error ?? 'Could not continue.')
    if (!res.data?.question) return setError(t('auth.recoverNoQuestion'))
    setQuestion(res.data.question)
    setStage('answer')
  }

  async function submitReset(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (password !== confirm) return setError(t('setup.passwordMismatch'))
    if (password.length < 4) return setError(t('common.required'))
    setBusy(true)
    setError(null)
    const res = await window.api.auth.resetPassword({
      username: username.trim(),
      answer,
      newPassword: password
    })
    setBusy(false)
    if (!res.ok) return setError(res.error ?? 'Could not reset password.')
    setStage('done')
  }

  return (
    <Modal title={t('auth.recoverTitle')} onClose={onClose}>
      {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

      {stage === 'username' && (
        <form onSubmit={lookupQuestion} className="space-y-4">
          <p className="text-sm text-slate-500">{t('auth.recoverIntro')}</p>
          <div>
            <label className="label-field">{t('auth.username')}</label>
            <input
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldQuestion className="h-4 w-4" />}
            {t('auth.recoverContinue')}
          </button>
        </form>
      )}

      {stage === 'answer' && (
        <form onSubmit={submitReset} className="space-y-4">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t('setup.securityQuestion')}
            </div>
            <div className="mt-1 font-medium text-slate-800">{question}</div>
          </div>
          <div>
            <label className="label-field">{t('auth.recoverAnswer')}</label>
            <input
              className="input-field"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div>
            <label className="label-field">{t('auth.recoverNewPassword')}</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label-field">{t('auth.recoverConfirmPassword')}</label>
            <input
              type="password"
              className="input-field"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {t('auth.recoverSubmit')}
          </button>
        </form>
      )}

      {stage === 'done' && (
        <div className="flex flex-col items-center py-6 text-center">
          <CheckCircle2 className="h-14 w-14 text-brand-500" />
          <p className="mt-4 text-slate-700">{t('auth.recoverSuccess')}</p>
          <button className="btn-primary mt-6" onClick={onClose}>
            {t('auth.signIn')}
          </button>
        </div>
      )}
    </Modal>
  )
}
