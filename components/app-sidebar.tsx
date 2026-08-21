/**
 * File: components/app-sidebar.tsx
 * Mô tả: Sidebar navigation - theme xanh quân đội
 */

"use client"

import { usePathname, useRouter } from "next/navigation"
import { Layout, Typography } from "antd"
import {
  DashboardOutlined,
  TeamOutlined,
  UserAddOutlined,
  BarChartOutlined,
  FileTextOutlined,
  HistoryOutlined,
  SettingOutlined,
  StarFilled,
  SafetyCertificateOutlined,
  BellOutlined,
  DatabaseOutlined,
} from "@ant-design/icons"

const { Sider } = Layout

interface SidebarItem {
  key: string
  icon: React.ReactNode
  label: string
  path: string
}

const menuItems: SidebarItem[] = [
  { key: "overview", icon: <DashboardOutlined />, label: "Tổng quan", path: "/" },
  { key: "soldiers", icon: <TeamOutlined />, label: "Danh sách quân nhân", path: "/soldiers" },
  { key: "add", icon: <UserAddOutlined />, label: "Thêm quân nhân", path: "/soldiers/add" },
  // Tạm thời ẩn Báo cáo – Thống kê
  // { key: "reports", icon: <BarChartOutlined />, label: "Báo cáo – Thống kê", path: "/reports" },
  { key: "documents", icon: <FileTextOutlined />, label: "Tài liệu quân lực", path: "/documents" },
  { key: "permissionRequests", icon: <BellOutlined />, label: "Yêu cầu cấp quyền", path: "/permission-requests" },
  { key: "history", icon: <HistoryOutlined />, label: "Lịch sử thay đổi", path: "/change-history" },
  { key: "permissions", icon: <SafetyCertificateOutlined />, label: "Quản lý quyền", path: "/permissions" },
  // { key: "backup", icon: <DatabaseOutlined />, label: "Quản lý Backup", path: "/backup" },
  // { key: "settings", icon: <SettingOutlined />, label: "Cài đặt hệ thống", path: "/settings" },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const getActiveKey = () => {
    if (pathname === "/") return "overview"
    if (pathname === "/notifications/send") return ""
    if (pathname === "/soldiers/add") return "add"
    if (pathname.startsWith("/soldiers")) return "soldiers"
    if (pathname.startsWith("/reports")) return "reports"
    if (pathname.startsWith("/documents")) return "documents"
    if (pathname.startsWith("/permission-requests")) return "permissionRequests"
    if (pathname.startsWith("/change-history")) return "history"
    if (pathname.startsWith("/permissions")) return "permissions"
    if (pathname.startsWith("/backup")) return "backup"
    if (pathname.startsWith("/settings")) return "settings"
    return "overview"
  }

  const activeKey = getActiveKey()

  return (
    <Sider
      width={260}
      style={{
        background: "#1a2e1a",
        height: "calc(100vh - 64px)",
        position: "sticky",
        top: 64,
        left: 0,
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Menu Items */}
      <div style={{ flex: 1, paddingTop: 8 }}>
        {menuItems.map((item) => {
          const isActive = activeKey === item.key
          return (
            <div
              key={item.key}
              onClick={() => router.push(item.path)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 20px",
                margin: "2px 10px",
                borderRadius: 8,
                cursor: "pointer",
                background: isActive ? "rgba(74,120,60,0.5)" : "transparent",
                color: isActive ? "#fff" : "rgba(255,255,255,0.7)",
                fontWeight: isActive ? 600 : 400,
                fontSize: 14,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(74,120,60,0.25)"
                  e.currentTarget.style.color = "#fff"
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent"
                  e.currentTarget.style.color = "rgba(255,255,255,0.7)"
                }
              }}
            >
              <span style={{ fontSize: 18, display: "flex", alignItems: "center" }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          )
        })}
      </div>

      {/* Decorative Banner */}
      <div
        style={{
          margin: "12px 14px 16px",
          padding: "20px 16px",
          borderRadius: 10,
          background: "linear-gradient(135deg, rgba(30,60,30,0.9) 0%, rgba(20,40,20,0.95) 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: 500, lineHeight: 1.6, textAlign: "center" }}>
          Đoàn kết Trung Dũng
          <br />
          Chủ động linh hoạt
          <br />
          Tự lực tự cường
          <br />
          Đánh thắng mọi kẻ thù
        </div>
        <StarFilled style={{ color: "#d4a843", fontSize: 16, marginTop: 10 }} />
      </div>
    </Sider>
  )
}
