import { Inter, Outfit } from 'next/font/google'
import './globals.css'
import { SpeedInsights } from '@vercel/speed-insights/next'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
})

export const metadata = {
  title: 'Quiniela Mundial 2026 - Porra Interactiva',
  description: 'Compite con tus amigos en la Quiniela del Mundial 2026. Predicciones en vivo, draft exclusivo de equipos y jugadores, y puntuación en tiempo real.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${outfit.variable} scroll-smooth`}>
      <body className="wc2026-bg min-h-screen text-slate-100 font-sans antialiased">
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
