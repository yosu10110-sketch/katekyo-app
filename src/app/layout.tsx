import type { Metadata } from 'next'
import { M_PLUS_Rounded_1c } from 'next/font/google'
import './globals.css'

const font = M_PLUS_Rounded_1c({
  weight: ['400', '500', '700', '800'],
  subsets: ['latin'],
  variable: '--font-rounded',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'カテキョサポート',
  description: '家庭教師・生徒・保護者のためのオンライン授業サポートアプリ',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={`${font.variable} h-full`}>
      <body className={`${font.className} h-full bg-gray-50 antialiased`}>{children}</body>
    </html>
  )
}
