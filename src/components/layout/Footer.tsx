import Link from 'next/link'
import { MapPin, Mail, Phone } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-forest text-white/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="w-9 h-9 rounded-md bg-gold flex items-center justify-center text-forest font-serif font-bold text-sm">
                GK
              </span>
              <span className="font-serif font-semibold text-lg text-white">Golden Key</span>
            </Link>
            <p className="text-sm text-white/60 leading-relaxed">
              Информационный каталог элитной недвижимости в Дубае с персональным подбором и прозрачным сопровождением.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Навигация</h3>
            <ul className="space-y-2.5">
              <li><Link href="/properties" className="text-sm text-white/60 hover:text-white transition-colors">Каталог</Link></li>
              <li><Link href="/properties?deal_type=sale" className="text-sm text-white/60 hover:text-white transition-colors">Купить</Link></li>
              <li><Link href="/properties?deal_type=rent" className="text-sm text-white/60 hover:text-white transition-colors">Арендовать</Link></li>
              <li><Link href="/about" className="text-sm text-white/60 hover:text-white transition-colors">О нас</Link></li>
              <li><Link href="/contact" className="text-sm text-white/60 hover:text-white transition-colors">Контакты</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Клиентам</h3>
            <ul className="space-y-2.5">
              <li><Link href="/auth/register" className="text-sm text-white/60 hover:text-white transition-colors">Регистрация</Link></li>
              <li><Link href="/dashboard" className="text-sm text-white/60 hover:text-white transition-colors">Личный кабинет</Link></li>
              <li><Link href="/properties/new" className="text-sm text-white/60 hover:text-white transition-colors">Разместить объявление</Link></li>
              <li><Link href="/privacy" className="text-sm text-white/60 hover:text-white transition-colors">Конфиденциальность</Link></li>
              <li><Link href="/terms" className="text-sm text-white/60 hover:text-white transition-colors">Условия</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Контакты</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                <span className="text-sm text-white/60">Dubai, UAE<br />Business Bay, Executive Tower</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-gold shrink-0" />
                <a href="tel:+97100000000" className="text-sm text-white/60 hover:text-white transition-colors">+971 (0) 000-0000</a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-gold shrink-0" />
                <a href="mailto:info@goldenkey.ae" className="text-sm text-white/60 hover:text-white transition-colors">info@goldenkey.ae</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">© {new Date().getFullYear()} Golden Key Property. Все права защищены.</p>
          <p className="text-xs text-white/40">Информация носит справочный характер и не является публичной офертой.</p>
        </div>
      </div>
    </footer>
  )
}
