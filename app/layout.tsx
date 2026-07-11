import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { AntdProvider } from '@/components/antd-provider'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Hệ thống quản lý thông tin Quân đội',
  description: 'Hiển thị và điều chỉnh thông tin của toàn Quân nhân trong Sư đoàn 5',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/avatarqlqdtvc.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/avatarqlqdtvc.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/avatarqlqdtvc.png',
        type: 'image/svg+xml',
      },
    ],
    apple: '/avatarqlqdtvc.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        <AntdProvider>{children}</AntdProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
