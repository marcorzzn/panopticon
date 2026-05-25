import type { Metadata } from 'next'
import { Suspense } from 'react'
import '@panopticon/ui/styles'
import '@panopticon/ui/themes/dark'
import '@panopticon/ui/themes/light'
import './globals.css'
import ErrorBoundary from '@/components/ErrorBoundary'

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
      data-theme="dark"
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var persisted = localStorage.getItem('panopticon-app-settings');
                  if (persisted) {
                    var parsed = JSON.parse(persisted);
                    if (parsed && parsed.state && parsed.state.theme) {
                      document.documentElement.setAttribute('data-theme', parsed.state.theme);
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-deepest text-primary h-screen w-screen overflow-hidden">
        <ErrorBoundary>
          <Suspense>
            {children}
          </Suspense>
        </ErrorBoundary>
      </body>
    </html>
  )
}

