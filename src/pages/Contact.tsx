import { useState } from 'react'
import { Mail, Phone, MapPin, Clock, Send, Loader2, CheckCircle2, Sparkles } from 'lucide-react'
import { Reveal } from '@/components/Reveal'
import { api } from '@/lib/api'
import { SITE } from '@/lib/config'

export default function Contact(): JSX.Element {
  const [form, setForm] = useState({ name: '', email: '', organization: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  function update<K extends keyof typeof form>(k: K, v: string): void {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setStatus('sending')
    try {
      await api.contact(form)
      setStatus('sent')
      setForm({ name: '', email: '', organization: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  const details = [
    { icon: Mail, label: 'Email', value: SITE.contact.email, href: `mailto:${SITE.contact.email}` },
    { icon: Phone, label: 'Phone', value: SITE.contact.phone, href: `tel:${SITE.contact.phone.replace(/\s/g, '')}` },
    { icon: MapPin, label: 'Location', value: SITE.contact.address },
    { icon: Clock, label: 'Hours', value: SITE.contact.hours }
  ]

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-orb-a absolute -left-40 -top-32 h-[26rem] w-[26rem] rounded-full bg-brand-300/30 blur-3xl" />
          <div className="animate-orb-b absolute -right-40 top-10 h-[24rem] w-[24rem] rounded-full bg-accent-300/25 blur-3xl" />
        </div>
        <div className="container-page relative py-16 text-center">
          <Reveal className="mx-auto max-w-2xl">
            <span className="eyebrow"><Sparkles className="h-4 w-4 text-accent-500" /> Contact us</span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              We&apos;d love to help your school
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-muted">
              Questions about installing {SITE.name}, training your staff, or bringing it to your school?
              Send us a message and we&apos;ll get back to you.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-24">
        <div className="container-page grid gap-8 lg:grid-cols-5">
          {/* Details */}
          <Reveal className="lg:col-span-2">
            <div className="h-full rounded-3xl bg-gradient-to-br from-brand-700 to-brand-600 p-8 text-white shadow-xl">
              <h2 className="text-2xl font-extrabold">Get in touch</h2>
              <p className="mt-2 text-brand-50">Reach us directly — we usually respond within a working day.</p>
              <div className="mt-8 space-y-6">
                {details.map((d) => (
                  <div key={d.label} className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                      <d.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-brand-100">{d.label}</div>
                      {d.href ? (
                        <a href={d.href} className="text-base font-semibold hover:underline">{d.value}</a>
                      ) : (
                        <div className="text-base font-semibold">{d.value}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Form */}
          <Reveal delay={120} className="lg:col-span-3">
            <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              {status === 'sent' ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle2 className="h-14 w-14 text-brand-500" />
                  <h3 className="mt-4 text-xl font-bold text-ink">Message sent!</h3>
                  <p className="mt-2 text-ink-muted">Thank you for reaching out. We&apos;ll be in touch shortly.</p>
                  <button type="button" className="btn-ghost mt-6" onClick={() => setStatus('idle')}>
                    Send another message
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-extrabold text-ink">Send a message</h2>
                  <p className="mt-1 text-ink-muted">Fill in the form and we&apos;ll reply by email.</p>

                  {status === 'error' && (
                    <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                      Something went wrong. Please try again or email us directly.
                    </div>
                  )}

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Full name</label>
                      <input className="input" required value={form.name} onChange={(e) => update('name', e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input type="email" className="input" required value={form.email} onChange={(e) => update('email', e.target.value)} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="label">School / organisation <span className="font-normal text-ink-muted">(optional)</span></label>
                    <input className="input" value={form.organization} onChange={(e) => update('organization', e.target.value)} />
                  </div>
                  <div className="mt-4">
                    <label className="label">Message</label>
                    <textarea className="input min-h-[140px] resize-y" required value={form.message} onChange={(e) => update('message', e.target.value)} />
                  </div>
                  <button type="submit" className="btn-primary mt-6 w-full sm:w-auto" disabled={status === 'sending'}>
                    {status === 'sending' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    Send message
                  </button>
                </>
              )}
            </form>
          </Reveal>
        </div>
      </section>
    </>
  )
}
