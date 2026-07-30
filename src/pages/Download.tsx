import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Download as DownloadIcon,
  FileText,
  Check,
  Loader2,
  ShieldCheck,
  WifiOff,
  Monitor,
  RotateCw,
  AlertCircle,
  ArrowRight,
  LifeBuoy
} from 'lucide-react'
import { Reveal } from '@/components/Reveal'
import { api } from '@/lib/api'
import { SITE } from '@/lib/config'

type Phase = 'preparing' | 'downloading' | 'done' | 'fallback'

const GUIDE_PATH = '/JuniorIgnite-Setup-Guide.pdf'

function fmtMB(bytes: number): string {
  return (bytes / 1048576).toFixed(1)
}
function fileNameFrom(url: string, version: string): string {
  const base = url.split('/').pop() || ''
  return base.toLowerCase().endsWith('.exe') ? base : `JuniorIgnite-Setup-${version}.exe`
}

/**
 * Dedicated download page. Streams the installer so it can show real progress,
 * then saves it — and prompts the visitor to also grab the setup guide. Falls
 * back to a plain download link if streaming isn't possible (e.g. the file is
 * served cross-origin or the browser blocks the stream).
 */
export default function Download(): JSX.Element {
  const [phase, setPhase] = useState<Phase>('preparing')
  const [received, setReceived] = useState(0)
  const [total, setTotal] = useState(0)
  const [fileUrl, setFileUrl] = useState<string>(SITE.installerPath)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return // guard StrictMode double-invoke
    started.current = true
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function run(): Promise<void> {
    setPhase('preparing')
    setReceived(0)
    setTotal(0)
    // Record the download (increments the public counter) and get the real URL.
    let url: string = SITE.installerPath
    try {
      const r = await api.recordDownload()
      url = r.url || SITE.installerPath
    } catch {
      /* keep static path */
    }
    setFileUrl(url)

    try {
      const res = await fetch(url)
      if (!res.ok || !res.body) throw new Error('no stream')
      const len = Number(res.headers.get('Content-Length')) || 0
      setTotal(len)
      setPhase('downloading')

      const reader = res.body.getReader()
      const chunks: BlobPart[] = []
      let got = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength))
          got += value.length
          setReceived(got)
        }
      }
      const blob = new Blob(chunks, { type: 'application/octet-stream' })
      saveBlob(blob, fileNameFrom(url, SITE.version))
      setPhase('done')
    } catch {
      // Streaming unavailable — hand off to the browser's own downloader.
      triggerDirect(url)
      setPhase('fallback')
    }
  }

  function saveBlob(blob: Blob, name: string): void {
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 4000)
  }
  function triggerDirect(url: string): void {
    const a = document.createElement('a')
    a.href = url
    a.setAttribute('download', '')
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  function retry(): void {
    started.current = false
    void run()
    started.current = true
  }

  const pct = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 0
  const indeterminate = phase === 'downloading' && total === 0

  return (
    <div className="relative overflow-hidden">
      {/* soft header wash */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-gradient-to-b from-brand-50/70 to-white" />
      <div className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-[26rem]" />

      <section className="container-page relative pt-16 pb-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">
            <DownloadIcon className="h-3.5 w-3.5 text-accent-500" /> Download
          </span>
          <h1 className="mt-5 text-display-sm font-extrabold text-ink balance sm:text-display">
            {phase === 'done' ? 'Your download is ready.' : 'Your download is starting.'}
          </h1>
          <p className="mt-4 text-lg text-ink-muted">
            JuniorIgnite Desktop · Version {SITE.version} · Windows 10 &amp; 11 · {SITE.installerSizeMb} MB
          </p>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-5">
          {/* ---- download status ---- */}
          <Reveal className="lg:col-span-3">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-7 shadow-soft sm:p-9">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white shadow-soft">
                  <img src="/logo.png" alt="" className="h-11 w-11" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-bold text-ink">JuniorIgnite Desktop</div>
                  <div className="text-sm text-ink-muted">
                    Windows installer (.exe) · {SITE.installerSizeMb} MB
                  </div>
                </div>
                <div className="ml-auto hidden sm:block">
                  {phase === 'done' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700">
                      <Check className="h-4 w-4" /> Complete
                    </span>
                  ) : phase === 'fallback' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
                      <AlertCircle className="h-4 w-4" /> Manual
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700">
                      <Loader2 className="h-4 w-4 animate-spin" /> Downloading
                    </span>
                  )}
                </div>
              </div>

              {/* progress */}
              <div className="mt-7">
                <div className="mb-2 flex items-baseline justify-between text-sm">
                  <span className="font-semibold text-ink-soft">
                    {phase === 'preparing' && 'Preparing your download…'}
                    {phase === 'downloading' && 'Downloading JuniorIgnite…'}
                    {phase === 'done' && 'Download complete'}
                    {phase === 'fallback' && 'Download started in your browser'}
                  </span>
                  {phase === 'downloading' && !indeterminate && (
                    <span className="font-bold tabular-nums text-brand-600">{pct}%</span>
                  )}
                  {phase === 'done' && <span className="font-bold text-brand-600">100%</span>}
                </div>

                <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  {indeterminate || phase === 'preparing' ? (
                    <div className="animate-indeterminate absolute inset-y-0 left-0 w-1/3 rounded-full bg-brand-500/80" />
                  ) : (
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-[width] duration-200 ease-out"
                      style={{ width: `${phase === 'done' ? 100 : pct}%` }}
                    />
                  )}
                </div>

                <div className="mt-2 text-sm text-ink-muted">
                  {phase === 'downloading' &&
                    (total > 0 ? `${fmtMB(received)} MB of ${fmtMB(total)} MB` : `${fmtMB(received)} MB received…`)}
                  {phase === 'preparing' && 'Connecting…'}
                  {phase === 'done' && 'Saved to your Downloads folder. You can close this once it appears.'}
                  {phase === 'fallback' && 'If nothing happened, use the button below to download it manually.'}
                </div>
              </div>

              {/* actions */}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                {phase === 'fallback' && (
                  <a href={fileUrl} download className="btn-primary">
                    <DownloadIcon className="h-5 w-5" /> Download for Windows
                  </a>
                )}
                {(phase === 'done' || phase === 'fallback') && (
                  <button onClick={retry} className="btn-ghost">
                    <RotateCw className="h-4 w-4" /> Download again
                  </button>
                )}
                {phase === 'done' && (
                  <Link to="/home#video" className="text-sm font-semibold text-brand-700 hover:underline">
                    Watch the setup video →
                  </Link>
                )}
              </div>
            </div>

            {/* what happens next */}
            <div className="mt-6 rounded-3xl border border-slate-200/80 bg-white p-7 shadow-soft">
              <h2 className="text-lg font-bold text-ink">What happens next</h2>
              <ol className="mt-5 space-y-5">
                {[
                  ['Run the installer', 'Open the downloaded file. If Windows shows “Windows protected your PC”, click More info → Run anyway — this is normal for a new app.'],
                  ['Create your school account', 'Launch JuniorIgnite and follow the first-time setup to add your school’s details and administrator.'],
                  ['Keep the guide handy', 'The setup guide (on the right) walks you through every step in a few minutes.']
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-ink">{t}</div>
                      <div className="mt-0.5 text-sm leading-relaxed text-ink-muted">{d}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>

          {/* ---- side column ---- */}
          <Reveal delay={120} className="lg:col-span-2">
            {/* setup guide — highlighted so people don't skip it */}
            <div className="rounded-3xl border-2 border-brand-200 bg-brand-50/60 p-7 shadow-soft">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
                <FileText className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-ink">Don’t skip this — get the setup guide</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                A short, illustrated PDF that walks you through installing JuniorIgnite and creating your school
                account. Download it now and keep it beside you while you set up.
              </p>
              <a href={GUIDE_PATH} download className="btn-primary mt-5 w-full">
                <DownloadIcon className="h-5 w-5" /> Download the guide (PDF)
              </a>
              <p className="mt-3 text-center text-xs text-ink-muted">Free · about 5 pages · no account needed</p>
            </div>

            {/* requirements */}
            <div className="mt-6 rounded-3xl border border-slate-200/80 bg-white p-7 shadow-soft">
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink-muted">Requirements</h3>
              <ul className="mt-4 space-y-3.5 text-sm">
                <li className="flex items-center gap-3 text-ink-soft">
                  <Monitor className="h-4.5 w-4.5 text-brand-600" /> Windows 10 or 11 (64-bit)
                </li>
                <li className="flex items-center gap-3 text-ink-soft">
                  <DownloadIcon className="h-4.5 w-4.5 text-brand-600" /> ~{SITE.installerSizeMb} MB download · ~300 MB installed
                </li>
                <li className="flex items-center gap-3 text-ink-soft">
                  <WifiOff className="h-4.5 w-4.5 text-brand-600" /> Works fully offline after install
                </li>
                <li className="flex items-center gap-3 text-ink-soft">
                  <ShieldCheck className="h-4.5 w-4.5 text-brand-600" /> Your data stays on your computer
                </li>
              </ul>
            </div>

            {/* trouble */}
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-slate-50 px-5 py-4">
              <LifeBuoy className="h-5 w-5 shrink-0 text-ink-muted" />
              <p className="text-sm text-ink-muted">
                Trouble downloading?{' '}
                <Link to="/contact" className="font-semibold text-brand-700 hover:underline">
                  Contact us
                </Link>{' '}
                and we’ll help.
              </p>
            </div>
          </Reveal>
        </div>

        <div className="mt-12 text-center">
          <Link to="/home" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-brand-700">
            <ArrowRight className="h-4 w-4 rotate-180" /> Back to home
          </Link>
        </div>
      </section>
    </div>
  )
}
