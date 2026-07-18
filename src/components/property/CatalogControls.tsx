'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Grid3X3, List, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'

interface Props {
  total: number
}

export function CatalogControls({ total }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { catalogView, setCatalogView } = useAppStore()

  const sortBy = searchParams.get('sort_by') || 'date_desc'

  const updateSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort_by', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center justify-between mb-6 pb-4 border-b border-ink/5">
      <p className="text-sm text-ink-muted">
        {total > 0 ? `${total} объектов` : 'Нет результатов'}
      </p>

      <div className="flex items-center gap-3">
        {/* Sort */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-ink-muted hidden sm:block" />
          <select
            className="text-sm border border-ink/15 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:border-forest"
            value={sortBy}
            onChange={(e) => updateSort(e.target.value)}
          >
            <option value="date_desc">Новые</option>
            <option value="date_asc">Старые</option>
            <option value="price_asc">Дешевле</option>
            <option value="price_desc">Дороже</option>
            <option value="popular">Популярные</option>
          </select>
        </div>

        {/* View toggle */}
        <div className="hidden sm:flex border border-ink/15 rounded-md overflow-hidden">
          <button
            className={cn('p-1.5', catalogView === 'grid' ? 'bg-forest text-white' : 'text-ink-muted hover:bg-ink/5')}
            onClick={() => setCatalogView('grid')}
            aria-label="Сетка"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            className={cn('p-1.5', catalogView === 'list' ? 'bg-forest text-white' : 'text-ink-muted hover:bg-ink/5')}
            onClick={() => setCatalogView('list')}
            aria-label="Список"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
