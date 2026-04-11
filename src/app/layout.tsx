import type { Metadata, Viewport } from 'next'
import { Inter, Sarabun } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import './globals.css'

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['400', '500'],
  variable: '--font-primary',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-fallback',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Aurasea',
  description: 'Operational Intelligence for SME Hospitality & F&B',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={`${sarabun.variable} ${inter.variable}`}>
      <body suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
