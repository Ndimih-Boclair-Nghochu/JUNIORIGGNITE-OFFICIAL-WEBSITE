import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

export interface SidebarItem {
  to: string
  label: string
  icon: LucideIcon
}

export function Sidebar({
  items,
  header,
  footer
}: {
  items: SidebarItem[]
  header?: React.ReactNode
  footer?: React.ReactNode
}): JSX.Element {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      {header}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to.endsWith('dashboard') || item.to.endsWith('class-home')}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
              )
            }
          >
            <item.icon className="h-4.5 w-4.5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      {footer}
    </aside>
  )
}
