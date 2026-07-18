import { Suspense } from 'react'
import { createServerSupabase } from '@/lib/supabase/server'
import { PropertyCard } from '@/components/property/PropertyCard'
import { CatalogFilters } from '@/components/property/CatalogFilters'
import { CatalogControls } from '@/components/property/CatalogControls'
import { Pagination } from '@/components/ui/Pagination'
import type { Property, PropertyFilters, PaginatedResult } from '@/types/database'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Каталог недвижимости',
  description: 'Все доступные объекты недвижимости в Дубае. Фильтруйте по типу, цене, району и характеристикам.',
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function getProperties(params: Record<string, string | string[] | undefined>): Promise<PaginatedResult<Property>> {
  try {
    const supabase = await createServerSupabase()
    const page = Number(params.page) || 1
    const perPage = Number(params.per_page) || 12
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    let query = supabase.from('properties').select('*', { count: 'exact' }).eq('status', 'active')

    if (params.deal_type) query = query.eq('deal_type', params.deal_type as string)
    if (params.property_type) query = query.eq('property_type', params.property_type as string)
    if (params.city) query = query.ilike('city', `%${params.city}%`)
    if (params.district) query = query.ilike('district', `%${params.district}%`)
    if (params.price_min) query = query.gte('price', Number(params.price_min))
    if (params.price_max) query = query.lte('price', Number(params.price_max))
    if (params.rooms_min) query = query.gte('rooms', Number(params.rooms_min))
    if (params.area_min) query = query.gte('area_sqm', Number(params.area_min))
    if (params.area_max) query = query.lte('area_sqm', Number(params.area_max))
    if (params.bedrooms) query = query.eq('bedrooms', Number(params.bedrooms))
    if (params.bathrooms_min) query = query.gte('bathrooms', Number(params.bathrooms_min))
    if (params.has_furniture === 'true') query = query.eq('has_furniture', true)
    if (params.has_balcony === 'true') query = query.eq('has_balcony', true)
    if (params.has_elevator === 'true') query = query.eq('has_elevator', true)
    if (params.has_parking === 'true') query = query.gt('parking', 0)
    if (params.year_built_min) query = query.gte('year_built', Number(params.year_built_min))
    if (params.search) query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%,address.ilike.%${params.search}%`)

    // Sort
    const sortBy = (params.sort_by as string) || 'date_desc'
    switch (sortBy) {
      case 'price_asc': query = query.order('price', { ascending: true }); break
      case 'price_desc': query = query.order('price', { ascending: false }); break
      case 'date_asc': query = query.order('published_at', { ascending: true }); break
      case 'popular': query = query.order('views_count', { ascending: false }); break
      default: query = query.order('published_at', { ascending: false })
    }

    query = query.range(from, to)

    const { data, count } = await query
    const total = count || 0

    return {
      data: (data as Property[]) || [],
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    }
  } catch {
    return { data: [], total: 0, page: 1, per_page: 12, total_pages: 0 }
  }
}

export default async function PropertiesPage({ searchParams }: Props) {
  const params = await searchParams
  const result = await getProperties(params)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-fluid-3xl font-bold text-ink">Каталог недвижимости</h1>
        <p className="text-ink-muted mt-2">
          {result.total > 0 
            ? `Найдено ${result.total} объектов`
            : 'Используйте фильтры для поиска'
          }
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-72 shrink-0">
          <Suspense fallback={<div className="skeleton h-96 w-full" />}>
            <CatalogFilters />
          </Suspense>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          <CatalogControls total={result.total} />

          {result.data.length > 0 ? (
            <>
              <CatalogGrid properties={result.data} />
              {result.total_pages > 1 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={result.page}
                    totalPages={result.total_pages}
                  />
                </div>
              )}
            </>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  )
}

function CatalogGrid({ properties }: { properties: Property[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16 bg-paper-deep/50 rounded-xl">
      <div className="w-16 h-16 rounded-full bg-ink/5 flex items-center justify-center mx-auto mb-4">
        <Search className="w-7 h-7 text-ink-muted" />
      </div>
      <h3 className="font-serif text-xl text-ink mb-2">Ничего не найдено</h3>
      <p className="text-sm text-ink-muted max-w-md mx-auto">
        По выбранным фильтрам объектов нет. Попробуйте изменить параметры поиска или сбросить фильтры.
      </p>
    </div>
  )
}

import { Search } from 'lucide-react'
