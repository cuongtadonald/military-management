/**
 * File: components/page-layout.tsx
 * Mô tả: Layout wrapper với Header + Sidebar + Content area
 */

"use client"

import { Layout } from "antd"
import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"

const { Content } = Layout

interface PageLayoutProps {
  children: React.ReactNode
  onBellClick?: () => void
}

export function PageLayout({ children, onBellClick }: PageLayoutProps) {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <AppHeader onBellClick={onBellClick} />
      <Layout style={{ marginTop: 64 }}>
        <AppSidebar />
        <Content style={{ padding: "24px 28px", background: "#f5f5f0", minHeight: "calc(100vh - 64px)" }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
