import type { Metadata } from 'next'
import { Inter, JetBrains_Mono, Outfit } from 'next/font/google'
import '@panopticon/ui/styles'

const sansFont = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

const displayFont = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'Panopticon — Global Situational Awareness Platform',
  description: 'See everything. Understand everything. React before it happens.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${sansFont.variable} ${monoFont.variable} ${displayFont.variable}`}
      data-theme="midnight"
    >
      <body className="font-sans antialiased bg-deepest text-primary h-screen w-screen overflow-hidden">
        {children}
      </body>
    </html>
  )
}
