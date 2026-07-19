/**
 * File: components/app-header.tsx
 * Mô tả: Header ứng dụng với đầy đủ thông tin và dropdown menu
 * Cập nhật: 2026-07-03
 * 
 * Khôi phục giao diện cũ + thêm dropdown menu với:
 * - Trang chủ
 * - Quản lý quyền (chỉ hiện cho Level 1-2)
 * - Đăng xuất
 */

"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, Badge, Button, Dropdown, Layout, MenuProps, Typography } from "antd"
import { 
  BellOutlined, 
  UserOutlined, 
  ApartmentOutlined,
  HomeOutlined,
  SettingOutlined,
  LogoutOutlined 
} from "@ant-design/icons"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { useChangeLog } from "@/lib/change-log"
import UnitTree from "@/components/UnitTree"

const { Header } = Layout

interface AppHeaderProps {
  onBellClick?: () => void
}

export function AppHeader({ onBellClick }: AppHeaderProps) {
  const router = useRouter()
  const { user, logout, canManagePermissions } = useAuth()
  const { pendingCount } = useChangeLog()
  const [unitTreeVisible, setUnitTreeVisible] = useState(false)

  const hasNotification = pendingCount > 0

  // Dropdown menu items
  const menuItems: MenuProps['items'] = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: 'Trang chủ',
      onClick: () => router.push('/')
    },
    ...(canManagePermissions() ? [{
      key: 'permissions',
      icon: <SettingOutlined />,
      label: 'Quản lý quyền',
      onClick: () => router.push('/permissions')
    }] : []),
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
      onClick: () => logout()
    }
  ]

  return (
    <>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, textDecoration: "none" }}>
          <Avatar
            size={40}
            src="/avatarqlqdtvc.png"
            style={{ flexShrink: 0, cursor: "pointer", objectFit: "cover", backgroundColor: "#fff" }}
          />
          <div style={{ minWidth: 0 }}>
            <Typography.Text style={{ color: "#fff", fontWeight: 700, fontSize: 16, display: "block", lineHeight: 1.2 }} ellipsis>
              Hồ sơ quân đội
            </Typography.Text>
            <Typography.Text style={{ color: "#c7cba0", fontSize: 11, display: "block", lineHeight: 1.2 }} ellipsis>
              Hệ thống quản lý thông tin quân đội
            </Typography.Text>
          </div>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Nút Cơ cấu đơn vị */}
          <Button
            type="primary"
            icon={<ApartmentOutlined />}
            onClick={() => setUnitTreeVisible(true)}
            style={{ 
              background: "#4b5320",
              borderColor: "#4b5320",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 500,
            }}
            title="Cơ cấu tổ chức đơn vị"
          >
            <span className="hidden sm:inline">
              Cơ cấu đơn vị
            </span>
          </Button>

          {/* Nút chuông thông báo */}
          {hasNotification && (
            <div
              onClick={onBellClick}
              style={{
                position: "relative",
                cursor: onBellClick ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title={hasNotification ? `${pendingCount} đề xuất chờ phê duyệt` : "Không có thông báo mới"}
            >
              {hasNotification && (
                <span
                  style={{
                    position: "absolute",
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    backgroundColor: "rgba(250, 140, 22, 0.3)",
                    animation: "bellPulse 1.5s ease-in-out infinite",
                  }}
                />
              )}
              <Badge count={pendingCount} size="small" offset={[-2, 2]}>
                <BellOutlined
                  style={{
                    fontSize: 22,
                    color: hasNotification ? "#faad14" : "#fff",
                    animation: hasNotification ? "bellShake 1s ease-in-out infinite" : "none",
                    position: "relative",
                    zIndex: 1,
                  }}
                />
              </Badge>
            </div>
          )}

          {/* Thông tin user với dropdown */}
          <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
            <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{ textAlign: "right", lineHeight: 1.2 }} className="hidden sm:block">
                <Typography.Text style={{ color: "#fff", fontWeight: 600, fontSize: 14, display: "block" }}>
                  {user?.fullName || "Người dùng"}
                </Typography.Text>
                <Typography.Text style={{ color: "#c7cba0", fontSize: 11 }}>
                  {user?.roleName || "Chưa xác định"}
                </Typography.Text>
              </div>
              <Avatar size={40} icon={<UserOutlined />} style={{ backgroundColor: "#6b7330", flexShrink: 0 }} />
            </div>
          </Dropdown>
        </div>

        <style jsx global>{`
          @keyframes bellPulse {
            0% { transform: scale(0.8); opacity: 0.8; }
            50% { transform: scale(1.3); opacity: 0; }
            100% { transform: scale(0.8); opacity: 0.8; }
          }
          @keyframes bellShake {
            0%, 100% { transform: rotate(0deg); }
            15% { transform: rotate(14deg); }
            30% { transform: rotate(-12deg); }
            45% { transform: rotate(10deg); }
            60% { transform: rotate(-8deg); }
            75% { transform: rotate(4deg); }
          }
        `}</style>
      </Header>

      {/* Modal cây đơn vị */}
      {user?.userId && (
        <UnitTree
          userId={user.userId}
          visible={unitTreeVisible}
          onClose={() => setUnitTreeVisible(false)}
        />
      )}
    </>
  )
}