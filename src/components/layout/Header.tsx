'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, Heart, User, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const favorites = useAppStore((s) => s.favorites)

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="w-9 h-9 rounded-md bg-forest flex items-center justify-center text-white font-serif font-bold text-sm">
              GK
            </span>
            <span className="font-serif font-semibold text-lg text-ink hidden sm:block">
              Golden Key
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8" aria-label="Основная навигация">
            <Link href="/properties" className="text-sm font-medium text-ink-soft hover:text-ink transition-colors">
              Каталог
            </Link>
            <Link href="/about" className="text-sm font-medium text-ink-soft hover:text-ink transition-colors">
              О нас
            </Link>
            <Link href="/contact" className="text-sm font-medium text-ink-soft hover:text-ink transition-colors">
              Контакты
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/properties" className="btn-icon" aria-label="Поиск">
              <Search className="w-5 h-5 text-ink-soft" />
            </Link>
            <Link href="/dashboard/favorites" className="btn-icon relative" aria-label="Избранное">
              <Heart className="w-5 h-5 text-ink-soft" />
              {favorites.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gold text-forest text-[10px] font-bold rounded-full flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </Link>
            <Link href="/dashboard" className="btn-icon" aria-label="Личный кабинет">
              <User className="w-5 h-5 text-ink-soft" />
            </Link>

            <button
              className="btn-icon md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div
          className={cn(
            'md:hidden overflow-hidden transition-all duration-300 ease-out',
            isMenuOpen ? 'max-h-64 pb-4' : 'max-h-0'
          )}
        >
          <nav className="flex flex-col gap-1 pt-2 border-t border-black/5">
            <Link href="/properties" className="px-3 py-2.5 text-sm font-medium text-ink-soft hover:text-ink hover:bg-ink/5 rounded-md" onClick={() => setIsMenuOpen(false)}>
              Каталог
            </Link>
            <Link href="/about" className="px-3 py-2.5 text-sm font-medium text-ink-soft hover:text-ink hover:bg-ink/5 rounded-md" onClick={() => setIsMenuOpen(false)}>
              О нас
            </Link>
            <Link href="/contact" className="px-3 py-2.5 text-sm font-medium text-ink-soft hover:text-ink hover:bg-ink/5 rounded-md" onClick={() => setIsMenuOpen(false)}>
              Контакты
            </Link>
            <Link href="/auth/login" className="px-3 py-2.5 text-sm font-medium text-forest hover:bg-forest/5 rounded-md" onClick={() => setIsMenuOpen(false)}>
              Войти
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
