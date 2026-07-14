import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

export function Spinner({ className }: { className?: string }): JSX.Element {
  return <Loader2 className={clsx('animate-spin', className)} />
}

export function FullScreenSpinner(): JSX.Element {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
      <Spinner className="h-10 w-10 text-brand-600" />
    </div>
  )
}
