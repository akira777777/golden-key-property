'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState } from 'react'
import { Filter, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Апартаменты' },
  { value: 'villa', label: 'Вилла' },
  { value: 'townhouse', label: 'Таунхаус' },
  { value: 'penthouse', label: 'Пентхаус' },
  { value: 'studio', label: 'Студия' },
  { value: 'duplex', label: 'Дуплекс' },
  { value: 'land', label: 'Земля' },
  { value: 'commercial', label: 'Коммерция' },
]

const DISTRICTS = [
  'Downtown Dubai', 'Palm Jumeirah', 'Dubai Marina', 'Dubai Hills Estate',
  'DIFC', 'Business Bay', 'JBR', 'Jumeirah Bay Island', 'Arabian Ranches',
  'MBR City', 'Dubai Creek Harbour', 'Bluewaters Island',
]

export function CatalogFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mobileOpen, setMobileOpen] = useState(false)

  const currentParams = Object.fromEntries(searchParams.entries())

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page') // Reset page on filter change
    router.push(`${pathname}?${params.toString()}`)
  }

  const resetFilters = () => {
    router.push(pathname)
  }

  const hasFilters = searchParams.toString().length > 0

  const filterContent = (
    <div className="space-y-6">
      {/* Deal type */}
      <div>
        <label className="label">Тип сделки</label>
        <select
          className="input"
          value={currentParams.deal_type || ''}
          onChange={(e) => updateFilter('deal_type', e.target.value)}
        >
          <option value="">Все</option>
          <option value="sale">Купить</option>
          <option value="rent">Арендовать</option>
        </select>
      </div>

      {/* Property type */}
      <div>
        <label className="label">Тип недвижимости</label>
        <select
          className="input"
          value={currentParams.property_type || ''}
          onChange={(e) => updateFilter('property_type', e.target.value)}
        >
          <option value="">Все типы</option>
          {PROPERTY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* District */}
      <div>
        <label className="label">Район</label>
        <select
          className="input"
          value={currentParams.district || ''}
          onChange={(e) => updateFilter('district', e.target.value)}
        >
          <option value="">Все районы</option>
          {DISTRICTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Price range */}
      <div>
        <label className="label">Цена (USD)</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            className="input"
            placeholder="От"
            value={currentParams.price_min || ''}
            onChange={(e) => updateFilter('price_min', e.target.value)}
          />
          <input
            type="number"
            className="input"
            placeholder="До"
            value={currentParams.price_max || ''}
            onChange={(e) => updateFilter('price_max', e.target.value)}
          />
        </div>
      </div>

      {/* Bedrooms */}
      <div>
        <label className="label">Спальни</label>
        <div className="flex gap-1.5 flex-wrap">
          {['', '1', '2', '3', '4', '5', '6'].map((v) => (
            <button
              key={v}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md border transition-colors',
                currentParams.bedrooms === v || (!currentParams.bedrooms && v === '')
                  ? 'bg-forest text-white border-forest'
                  : 'border-ink/15 text-ink-soft hover:border-ink/30'
              )}
              onClick={() => updateFilter('bedrooms', v)}
            >
              {v || 'Все'}
              {v && '+'}
            </button>
          ))}
        </div>
      </div>

      {/* Area */}
      <div>
        <label className="label">Площадь (m²)</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            className="input"
            placeholder="От"
            value={currentParams.area_min || ''}
            onChange={(e) => updateFilter('area_min', e.target.value)}
          />
          <input
            type="number"
            className="input"
            placeholder="До"
            value={currentParams.area_max || ''}
            onChange={(e) => updateFilter('area_max', e.target.value)}
          />
        </div>
      </div>

      {/* Bathrooms */}
      <div>
        <label className="label">Санузлы (мин.)</label>
        <select
          className="input"
          value={currentParams.bathrooms_min || ''}
          onChange={(e) => updateFilter('bathrooms_min', e.target.value)}
        >
          <option value="">Любое</option>
          <option value="1">1+</option>
          <option value="2">2+</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
        </select>
      </div>

      {/* Checkboxes */}
      <div className="space-y-2.5">
        <label className="label">Удобства</label>
        {[
          { key: 'has_furniture', label: 'Мебель' },
          { key: 'has_parking', label: 'Парковка' },
          { key: 'has_balcony', label: 'Балкон' },
          { key: 'has_elevator', label: 'Лифт' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-ink/20 text-forest focus:ring-forest/20"
              checked={currentParams[key] === 'true'}
              onChange={(e) => updateFilter(key, e.target.checked ? 'true' : '')}
            />
            <span className="text-sm text-ink-soft">{label}</span>
          </label>
        ))}
      </div>

      {/* Year built */}
      <div>
        <label className="label">Год постройки (от)</label>
        <input
          type="number"
          className="input"
          placeholder="напр. 2020"
          value={currentParams.year_built_min || ''}
          onChange={(e) => updateFilter('year_built_min', e.target.value)}
        />
      </div>

      {/* Reset */}
      {hasFilters && (
        <button onClick={resetFilters} className="btn-ghost w-full text-red-600 hover:bg-red-50">
          <X className="w-4 h-4" />
          Сбросить фильтры
        </button>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden btn-secondary w-full mb-4"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Filter className="w-4 h-4" />
        Фильтры
        <ChevronDown className={cn('w-4 h-4 ml-auto transition-transform', mobileOpen && 'rotate-180')} />
      </button>

      {/* Mobile filters */}
      <div className={cn('lg:hidden overflow-hidden transition-all', mobileOpen ? 'max-h-[2000px]' : 'max-h-0')}>
        <div className="bg-white rounded-lg border border-ink/10 p-5 mb-4">
          {filterContent}
        </div>
      </div>

      {/* Desktop filters */}
      <div className="hidden lg:block bg-white rounded-lg border border-ink/10 p-5 sticky top-24">
        <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Фильтры
        </h3>
        {filterContent}
      </div>
    </>
  )
}
