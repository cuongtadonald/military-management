import type { Metadata } from "next"
import "./globals.css"
import { AntdProvider } from "@/components/antd-provider"
import { AuthProvider } from "@/components/auth-provider"
import { ChangeLogProvider } from "@/lib/change-log"

export const metadata: Metadata = {
  icons: {
    icon: "/logovn.jpg",
    apple: "/logovn.jpg",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AntdProvider>
          <AuthProvider>
            <ChangeLogProvider>
              {children}
            </ChangeLogProvider>
          </AuthProvider>
        </AntdProvider>
      </body>
    </html>
  )
}