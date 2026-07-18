import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: {
    default: 'Golden Key — Каталог недвижимости в Дубае',
    template: '%s | Golden Key Property',
  },
  description: 'Информационный каталог элитной недвижимости в Дубае с персональным подбором и сопровождением сделки.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    alternateLocale: ['en_US'],
    siteName: 'Golden Key Property',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="flex flex-col min-h-dvh">
        <Providers>
          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: 'text-sm',
              duration: 4000,
              style: {
                borderRadius: '10px',
                background: '#1a3a34',
                color: '#fff',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
