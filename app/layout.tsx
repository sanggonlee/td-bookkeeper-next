import type { Metadata } from 'next'
import StyledComponentsRegistry from '@/lib/registry'

export const metadata: Metadata = {
  title: 'J&S Bookkeeper',
  description: 'Bank transaction categorizer',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body style={{ margin: 0 }}>
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  )
}
