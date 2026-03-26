import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Humor Chain Studio',
  description: 'Superadmin tool for building humor flavors, chaining steps, and testing caption generation.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
