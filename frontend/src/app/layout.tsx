import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: "Blech's RAG",
  description: 'Enterprise Search and Retrieval',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} antialiased dark`}>
      <body className="bg-zinc-950 text-zinc-50 min-h-screen">
        {children}
      </body>
    </html>
  )
}