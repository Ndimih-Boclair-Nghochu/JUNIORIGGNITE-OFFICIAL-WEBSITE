import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Lock, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { api } from '@/lib/api'

export default function FounderLogin(): JSX.Element {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.founderLogin(email, password)
      navigate('/founder/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-white via-brand-50/40 to-white px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-orb-a absolute -left-40 -top-32 h-[26rem] w-[26rem] rounded-full bg-brand-300/40 blur-3xl" />
        <div className="animate-orb-b absolute -right-40 bottom-0 h-[24rem] w-[24rem] rounded-full bg-accent-300/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo className="h-11 w-11" />
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold text-ink">Founder console</h1>
            <p className="mt-1 text-sm text-ink-muted">Sign in to manage the platform, schools and downloads.</p>
          </div>

          {error && (
            <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
              Sign in
            </button>
          </form>

          <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-xs text-ink-muted">
            <span className="font-semibold text-ink-soft">Demo access:</span> founder@juniorignite.app / founder123
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-brand-700">
            <ArrowLeft className="h-4 w-4" /> Back to website
          </Link>
        </div>
      </div>
    </div>
  )
}
