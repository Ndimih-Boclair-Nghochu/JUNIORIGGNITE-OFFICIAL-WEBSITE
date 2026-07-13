import { Construction } from 'lucide-react'
import { EmptyState } from '../../components/EmptyState'

export function ComingSoon({ title }: { title: string }): JSX.Element {
  return (
    <div className="p-8">
      <EmptyState icon={Construction} title={title} description="This module is being built next." />
    </div>
  )
}
