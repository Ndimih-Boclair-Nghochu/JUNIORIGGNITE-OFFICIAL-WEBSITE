import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function Modal({
  title,
  onClose,
  children,
  widthClassName
}: {
  title: string
  onClose: () => void
  children: ReactNode
  widthClassName?: string
}): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6" onClick={onClose}>
      <div
        className={`flex max-h-[90vh] w-full ${widthClassName ?? 'max-w-md'} flex-col rounded-2xl bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed header; the body below scrolls so long forms stay fully reachable. */}
        <div className="flex shrink-0 items-center justify-between px-6 pt-6 pb-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </div>
  )
}
