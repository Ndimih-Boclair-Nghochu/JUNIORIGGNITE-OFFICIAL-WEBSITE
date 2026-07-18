import { useState } from 'react'
import { LifeBuoy, Phone, Copy, Check, KeyRound, X, Smartphone } from 'lucide-react'
import { SUPPORT } from '@shared/constants'

/**
 * "Need Help?" support page. Reusable from the admin sidebar and from the
 * expired lock screen. `onActivate` / `onClose` are optional so it works both
 * as a routed page (no buttons) and inside the lock screen (with them).
 */
export default function SupportPage({
  onActivate,
  onClose
}: {
  onActivate?: () => void
  onClose?: () => void
}): JSX.Element {
  const [copied, setCopied] = useState(false)

  async function copyMomo(): Promise<void> {
    try {
      await navigator.clipboard.writeText(SUPPORT.mobileMoney)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard unavailable — number stays visible */
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Warm, trustworthy header */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-700 px-8 py-8 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
              <LifeBuoy className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold">Need Help?</h1>
          </div>
          <p className="mt-4 max-w-prose leading-relaxed text-white/90">
            Thank you for choosing {SUPPORT.product}. Our team is always ready to assist your school with activation,
            technical support, software updates, training, and any questions you may have. If your license has expired,
            simply contact us and we will guide you through the renewal process quickly. We appreciate your trust in{' '}
            {SUPPORT.product} and remain committed to supporting your school's digital transformation.
          </p>
        </div>

        <div className="space-y-4 p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <ContactCard icon={Phone} label="Phone 1" value={SUPPORT.phonePrimary} href={`tel:${SUPPORT.phonePrimary}`} />
            <ContactCard icon={Phone} label="Phone 2" value={SUPPORT.phoneSecondary} href={`tel:${SUPPORT.phoneSecondary}`} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-amber-600" />
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Mobile Money Payments</div>
                <div className="font-mono text-lg font-semibold text-slate-900">{SUPPORT.mobileMoney}</div>
              </div>
            </div>
            <button onClick={copyMomo} className="btn-secondary !py-2">
              {copied ? <Check className="h-4 w-4 text-brand-600" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy Number'}
            </button>
          </div>

          {(onActivate || onClose) && (
            <div className="flex flex-wrap gap-3 pt-2">
              {onActivate && (
                <button className="btn-primary" onClick={onActivate}>
                  <KeyRound className="h-5 w-5" />
                  Activate License
                </button>
              )}
              {onClose && (
                <button className="btn-secondary" onClick={onClose}>
                  <X className="h-5 w-5" />
                  Close
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ContactCard({
  icon: Icon,
  label,
  value,
  href
}: {
  icon: typeof Phone
  label: string
  value: string
  href: string
}): JSX.Element {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 transition hover:border-brand-300 hover:bg-brand-50"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
        <div className="font-mono text-lg font-semibold text-slate-900">{value}</div>
      </div>
    </a>
  )
}
