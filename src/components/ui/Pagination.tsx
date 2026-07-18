'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  currentPage: number
  totalPages: number
}

export function Pagination({ currentPage, totalPages }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(page))
    return `${pathname}?${params.toString()}`
  }

  const pages = getPageNumbers(currentPage, totalPages)

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Пагинация">
      <Link
        href={createPageUrl(currentPage - 1)}
        className={cn(
          'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
          currentPage <= 1
            ? 'pointer-events-none text-ink-muted/40'
            : 'text-ink-soft hover:bg-ink/5'
        )}
        aria-disabled={currentPage <= 1}
      >
        <ChevronLeft className="w-4 h-4" />
      </Link>

      {pages.map((page, i) => {
        if (page === '...') {
          return <span key={`dots-${i}`} className="w-9 h-9 flex items-center justify-center text-ink-muted text-sm">...</span>
        }
        const num = page as number
        return (
          <Link
            key={num}
            href={createPageUrl(num)}
            className={cn(
              'w-9 h-9 rounded-md flex items-center justify-center text-sm font-medium transition-colors',
              num === currentPage
                ? 'bg-forest text-white'
                : 'text-ink-soft hover:bg-ink/5'
            )}
          >
            {num}
          </Link>
        )
      })}

      <Link
        href={createPageUrl(currentPage + 1)}
        className={cn(
          'w-9 h-9 rounded-md flex items-center justify-center transition-colors',
          currentPage >= totalPages
            ? 'pointer-events-none text-ink-muted/40'
            : 'text-ink-soft hover:bg-ink/5'
        )}
        aria-disabled={currentPage >= totalPages}
      >
        <ChevronRight className="w-4 h-4" />
      </Link>
    </nav>
  )
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  
  const pages: (number | string)[] = []
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '...', total)
  } else if (current >= total - 3) {
    pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total)
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total)
  }
  return pages
}
