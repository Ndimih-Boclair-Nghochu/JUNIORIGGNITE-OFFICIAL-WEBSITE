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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" onClick={onClose}>
      <div
        className={`w-full ${widthClassName ?? 'max-w-md'} rounded-2xl bg-white p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
