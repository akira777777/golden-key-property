import Link from 'next/link'
import Image from 'next/image'
import { Search, Shield, Users, TrendingUp, Star, ArrowRight, Building2, Home, MapPin } from 'lucide-react'
import { createServerSupabase } from '@/lib/supabase/server'
import { PropertyCard } from '@/components/property/PropertyCard'
import type { Property } from '@/types/database'

async function getFeaturedProperties(): Promise<Property[]> {
  try {
    const supabase = await createServerSupabase()
    const { data } = await supabase
      .from('properties')
      .select('*')
      .eq('status', 'active')
      .order('views_count', { ascending: false })
      .limit(6)
    return (data as Property[]) || []
  } catch {
    return []
  }
}

export default async function HomePage() {
  const featured = await getFeaturedProperties()

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-forest text-white">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920&q=80"
            alt=""
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
          <div className="max-w-3xl">
            <p className="text-gold text-sm font-medium tracking-wider uppercase mb-4">
              Dubai Property Catalogue
            </p>
            <h1 className="font-serif text-fluid-5xl md:text-fluid-5xl font-bold leading-[1.1] text-balance">
              Недвижимость в <span className="text-gold">Дубае</span> — каталог, которому можно доверять.
            </h1>
            <p className="mt-6 text-lg text-white/70 leading-relaxed max-w-2xl">
              Информационная подборка объектов в знаковых районах Дубая — от пентхаусов Downtown до вилл на Palm Jumeirah.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/properties" className="btn-gold text-base px-8 py-4">
                <Search className="w-5 h-5" />
                Смотреть каталог
              </Link>
              <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-4 border border-white/30 text-white font-medium rounded-md hover:bg-white/10 transition-colors">
                Запросить подбор
              </Link>
            </div>
          </div>

          {/* Quick search */}
          <div className="mt-12 bg-white/10 backdrop-blur-lg rounded-xl p-6 max-w-4xl border border-white/10">
            <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-white/60 mb-1 block">Тип сделки</label>
                <select className="w-full px-3 py-2.5 rounded-md bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-gold">
                  <option value="">Все</option>
                  <option value="sale">Купить</option>
                  <option value="rent">Арендовать</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1 block">Тип недвижимости</label>
                <select className="w-full px-3 py-2.5 rounded-md bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-gold">
                  <option value="">Все типы</option>
                  <option value="apartment">Апартаменты</option>
                  <option value="villa">Вилла</option>
                  <option value="penthouse">Пентхаус</option>
                  <option value="townhouse">Таунхаус</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1 block">Район</label>
                <select className="w-full px-3 py-2.5 rounded-md bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-gold">
                  <option value="">Все районы</option>
                  <option value="downtown">Downtown Dubai</option>
                  <option value="palm">Palm Jumeirah</option>
                  <option value="marina">Dubai Marina</option>
                  <option value="hills">Dubai Hills</option>
                  <option value="difc">DIFC</option>
                </select>
              </div>
              <div className="flex items-end">
                <Link href="/properties" className="btn-gold w-full justify-center py-2.5">
                  <Search className="w-4 h-4" />
                  Найти
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-ink/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="font-serif font-bold text-3xl text-forest">250+</p>
              <p className="text-sm text-ink-muted mt-1">Объектов в каталоге</p>
            </div>
            <div>
              <p className="font-serif font-bold text-3xl text-forest">15+</p>
              <p className="text-sm text-ink-muted mt-1">Районов Дубая</p>
            </div>
            <div>
              <p className="font-serif font-bold text-3xl text-forest">98%</p>
              <p className="text-sm text-ink-muted mt-1">Довольных клиентов</p>
            </div>
            <div>
              <p className="font-serif font-bold text-3xl text-forest">5 лет</p>
              <p className="text-sm text-ink-muted mt-1">На рынке Дубая</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="section">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-sm font-medium text-gold uppercase tracking-wider mb-2">Selected Listings</p>
            <h2 className="section-title">Рекомендуемые объекты</h2>
            <p className="section-subtitle">Лучшие предложения, отобранные нашими экспертами</p>
          </div>
          <Link href="/properties" className="hidden md:flex items-center gap-1 text-sm font-medium text-forest hover:text-forest-bright transition-colors">
            Все объекты
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-paper-deep/50 rounded-xl">
            <Building2 className="w-12 h-12 text-ink-muted mx-auto mb-4" />
            <h3 className="font-serif text-xl text-ink mb-2">Каталог обновляется</h3>
            <p className="text-sm text-ink-muted max-w-md mx-auto">
              Объекты появятся здесь после подключения базы данных. Настройте Supabase и запустите миграцию.
            </p>
          </div>
        )}

        <div className="mt-8 text-center md:hidden">
          <Link href="/properties" className="btn-secondary">
            Смотреть все объекты
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Popular Areas */}
      <section className="bg-paper-deep py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title">Популярные районы</h2>
            <p className="section-subtitle mx-auto">Знаковые локации Дубая с высоким потенциалом</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { name: 'Downtown Dubai', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=80', count: 45 },
              { name: 'Palm Jumeirah', image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&q=80', count: 32 },
              { name: 'Dubai Marina', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80', count: 58 },
              { name: 'Dubai Hills', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80', count: 27 },
              { name: 'DIFC', image: 'https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=400&q=80', count: 19 },
            ].map((area) => (
              <Link
                key={area.name}
                href={`/properties?district=${encodeURIComponent(area.name)}`}
                className="group relative aspect-[3/4] rounded-lg overflow-hidden"
              >
                <Image src={area.image} alt={area.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="200px" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-white font-medium text-sm">{area.name}</p>
                  <p className="text-white/60 text-xs mt-0.5">{area.count} объектов</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Advantages */}
      <section className="section">
        <div className="text-center mb-12">
          <h2 className="section-title">Почему Golden Key</h2>
          <p className="section-subtitle mx-auto">Прозрачный подход к подбору недвижимости</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { icon: Shield, title: 'Проверенная информация', desc: 'Каждый объект проходит верификацию. Мы публикуем только достоверные данные.' },
            { icon: Users, title: 'Персональный подход', desc: 'Работаем с ограниченным числом клиентов — каждый получает внимание.' },
            { icon: TrendingUp, title: 'Экспертиза рынка', desc: '5 лет на рынке Дубая. Знаем каждый район, застройщика и нюанс.' },
            { icon: Star, title: 'Сопровождение сделки', desc: 'От первого звонка до ключей — помогаем на каждом этапе.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="text-center group">
              <div className="w-14 h-14 rounded-xl bg-forest/5 flex items-center justify-center mx-auto mb-4 group-hover:bg-forest/10 transition-colors">
                <Icon className="w-6 h-6 text-forest" />
              </div>
              <h3 className="font-serif font-semibold text-lg text-ink mb-2">{title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-forest text-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-fluid-3xl font-bold">Отзывы клиентов</h2>
            <p className="text-white/60 mt-3">Что говорят о нас</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Алексей К.', text: 'Профессиональный подход и глубокое знание рынка. Нашли идеальную квартиру за 2 недели.', rating: 5 },
              { name: 'Maria S.', text: 'Transparent process from start to finish. The team was responsive and knowledgeable about every district.', rating: 5 },
              { name: 'Дмитрий В.', text: 'Работали с несколькими агентствами — Golden Key единственные, кто не давил и помог принять взвешенное решение.', rating: 5 },
            ].map((review) => (
              <div key={review.name} className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-gold text-gold" />
                  ))}
                </div>
                <p className="text-white/80 text-sm leading-relaxed mb-4">&ldquo;{review.text}&rdquo;</p>
                <p className="text-sm font-medium text-gold">{review.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="section-title">Хотите разместить объявление?</h2>
          <p className="section-subtitle mx-auto">
            Зарегистрируйтесь как агент или владелец и опубликуйте свой объект в нашем каталоге.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/properties/new" className="btn-primary text-base px-8 py-4">
              <Home className="w-5 h-5" />
              Разместить объявление
            </Link>
            <Link href="/contact" className="btn-secondary text-base px-8 py-4">
              <MapPin className="w-5 h-5" />
              Связаться с нами
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
