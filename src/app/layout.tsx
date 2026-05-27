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
  title: '繧ｫ繝・く繝ｧ繧ｵ繝昴・繝・,
  description: '螳ｶ蠎ｭ謨吝ｸｫ繝ｻ逕溷ｾ偵・菫晁ｭｷ閠・・縺溘ａ縺ｮ繧ｪ繝ｳ繝ｩ繧､繝ｳ謗域･ｭ繧ｵ繝昴・繝医い繝励Μ',
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
