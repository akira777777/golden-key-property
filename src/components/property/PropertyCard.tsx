'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, MapPin, Bed, Bath, Maximize } from 'lucide-react'
import { cn, formatPrice, formatArea } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import type { Property } from '@/types/database'

interface PropertyCardProps {
  property: Property
  variant?: 'grid' | 'list'
}

export function PropertyCard({ property, variant = 'grid' }: PropertyCardProps) {
  const { isFavorite, addFavorite, removeFavorite } = useAppStore()
  const liked = isFavorite(property.id)

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (liked) {
      removeFavorite(property.id)
    } else {
      addFavorite(property.id)
    }
  }

  const statusBadge = {
    active: { label: 'Активно', className: 'badge-green' },
    pending: { label: 'На модерации', className: 'badge-yellow' },
    sold: { label: 'Продано', className: 'badge-red' },
    draft: { label: 'Черновик', className: 'badge-blue' },
    archived: { label: 'Архив', className: 'badge-blue' },
  }[property.status] || { label: property.status, className: 'badge-blue' }

  const dealLabel = property.deal_type === 'rent' ? 'Аренда' : 'Продажа'

  if (variant === 'list') {
    return (
      <Link href={`/properties/${property.slug}`} className="card flex flex-col sm:flex-row overflow-hidden group">
        <div className="relative w-full sm:w-72 h-48 sm:h-auto shrink-0">
          <Image
            src={property.images[0] || '/placeholder-property.jpg'}
            alt={property.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, 288px"
          />
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span className="badge bg-white/90 text-ink text-[11px] backdrop-blur-sm">{dealLabel}</span>
          </div>
          <button onClick={handleFavorite} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform" aria-label="В избранное">
            <Heart className={cn('w-4 h-4', liked ? 'fill-red-500 text-red-500' : 'text-ink-muted')} />
          </button>
        </div>
        <div className="flex-1 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-serif font-semibold text-lg text-ink group-hover:text-forest transition-colors line-clamp-1">
                {property.title}
              </h3>
              <span className={statusBadge.className}>{statusBadge.label}</span>
            </div>
            <p className="flex items-center gap-1 text-sm text-ink-muted mt-1">
              <MapPin className="w-3.5 h-3.5" />
              {property.district ? `${property.district}, ` : ''}{property.city}
            </p>
            <p className="text-sm text-ink-soft mt-2 line-clamp-2">{property.description}</p>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-ink/5">
            <p className="font-serif font-bold text-xl text-forest">
              {formatPrice(property.price, property.currency)}
              {property.deal_type === 'rent' && <span className="text-sm font-normal text-ink-muted">/мес</span>}
            </p>
            <div className="flex items-center gap-4 text-sm text-ink-muted">
              {property.bedrooms != null && (
                <span className="flex items-center gap-1"><Bed className="w-4 h-4" />{property.bedrooms}</span>
              )}
              {property.bathrooms != null && (
                <span className="flex items-center gap-1"><Bath className="w-4 h-4" />{property.bathrooms}</span>
              )}
              <span className="flex items-center gap-1"><Maximize className="w-4 h-4" />{formatArea(property.area_sqm)}</span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link href={`/properties/${property.slug}`} className="card overflow-hidden group flex flex-col">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={property.images[0] || '/placeholder-property.jpg'}
          alt={property.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="badge bg-white/90 text-ink text-[11px] backdrop-blur-sm">{dealLabel}</span>
          {property.status !== 'active' && (
            <span className={cn(statusBadge.className, 'text-[11px]')}>{statusBadge.label}</span>
          )}
        </div>
        <button onClick={handleFavorite} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform" aria-label="В избранное">
          <Heart className={cn('w-4 h-4', liked ? 'fill-red-500 text-red-500' : 'text-ink-muted')} />
        </button>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-serif font-semibold text-base text-ink group-hover:text-forest transition-colors line-clamp-1">
          {property.title}
        </h3>
        <p className="flex items-center gap-1 text-sm text-ink-muted mt-1">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="line-clamp-1">{property.district ? `${property.district}, ` : ''}{property.city}</span>
        </p>

        <div className="flex items-center gap-3 mt-3 text-sm text-ink-muted">
          {property.bedrooms != null && (
            <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5" />{property.bedrooms}</span>
          )}
          {property.bathrooms != null && (
            <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{property.bathrooms}</span>
          )}
          <span className="flex items-center gap-1"><Maximize className="w-3.5 h-3.5" />{formatArea(property.area_sqm)}</span>
        </div>

        <div className="mt-auto pt-3 border-t border-ink/5 mt-3">
          <p className="font-serif font-bold text-lg text-forest">
            {formatPrice(property.price, property.currency)}
            {property.deal_type === 'rent' && <span className="text-sm font-normal text-ink-muted">/мес</span>}
          </p>
        </div>
      </div>
    </Link>
  )
}
