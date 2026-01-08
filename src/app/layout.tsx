import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionProvider } from '@/components/providers/session-provider'

const inter = Inter({
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'AI School Platform',
  description: 'AI-powered education platform for Indian schools',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
