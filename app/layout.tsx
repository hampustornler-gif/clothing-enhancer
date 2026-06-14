import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Clothing Enhancer – Bättre produktbilder på en minut',
  description: 'AI-verktyg som förbättrar dina klädfotografier för Vinted, Tradera och mer.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  )
}
