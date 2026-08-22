import type { ReactNode } from 'react'
import { Breadcrumbs, type Crumb } from '@/components/Breadcrumbs'

interface Props {
  title: string
  description?: string
  crumbs?: Crumb[]
  actions?: ReactNode
}

export function PageHeader({ title, description, crumbs = [], actions }: Props) {
  return (
    <header className="mb-6">
      {crumbs.length > 0 && <Breadcrumbs items={crumbs} />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-display tracking-tight text-ink sm:text-display-lg">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-ink-600">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
