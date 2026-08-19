/**
 * File: components/app-header.tsx
 * Mô tả: Header ứng dụng với đầy đủ thông tin và dropdown menu
 * Cập nhật: 2026-08-19
 *
 * Khôi phục giao diện cũ + thêm dropdown menu với:
 * - Trang chủ
 * - Quản lý quyền (chỉ hiện cho Level 1-2)
 * - Đăng xuất
 * - Gửi thông báo
 */

"use client"

import Link from "next/link"
import { Avatar, Button, Dropdown, Layout, MenuProps, Tooltip, Typography } from "antd"
import {
  UserOutlined,
  HomeOutlined,
  SettingOutlined,
  LogoutOutlined,
  SoundOutlined,
} from "@ant-design/icons"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import NotificationBell from "@/components/notification-bell"

const { Header } = Layout

interface AppHeaderProps {
  onBellClick?: () => void
}

export function AppHeader({ onBellClick }: AppHeaderProps) {
  const router = useRouter()
  const { user, logout, canManagePermissions } = useAuth()

  // Dropdown menu items
  const menuItems: MenuProps["items"] = [
    {
      key: "home",
      icon: <HomeOutlined />,
      label: "Trang chủ",
      onClick: () => router.push("/"),
    },

    // ...(canManagePermissions() ? [{
    //   key: "permissions",
    //   icon: <SettingOutlined />,
    //   label: "Quản lý quyền",
    //   onClick: () => router.push("/permissions"),
    // }] : []),

    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Đăng xuất",
      danger: true,
      onClick: () => logout(),
    },
  ]

  return (
    <>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          background: "#0f2918",
          height: 64,
        }}
      >
        {/* Logo + tên hệ thống */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            minWidth: 0,
            textDecoration: "none",
          }}
        >
          <Avatar
            size={40}
            src="/logovn.jpg"
            style={{
              flexShrink: 0,
              cursor: "pointer",
              objectFit: "cover",
              backgroundColor: "#fff",
            }}
          />

          <div style={{ minWidth: 0 }}>
            <Typography.Text
              style={{
                color: "#fff",
                fontWeight: 700,
                fontSize: 16,
                display: "block",
                lineHeight: 1.2,
              }}
              ellipsis
            >
              Hồ sơ quân nhân
            </Typography.Text>

            <Typography.Text
              style={{
                color: "#c7cba0",
                fontSize: 11,
                display: "block",
                lineHeight: 1.2,
              }}
              ellipsis
            >
              Hệ thống quản lý thông tin quân nhân
            </Typography.Text>
          </div>
        </Link>

        {/* Các chức năng bên phải Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {/* Gửi thông báo */}
          <Tooltip title="Gửi thông báo" placement="bottom">
            <Button
              type="text"
              icon={<SoundOutlined style={{ fontSize: 20 }} />}
              onClick={() => router.push("/notifications/send")}
              aria-label="Gửi thông báo"
              style={{
                color: "#fff",
                width: 42,
                height: 42,
                padding: 0,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />
          </Tooltip>

          {/* Chuông thông báo */}
          <NotificationBell />

          {/* Thông tin user + dropdown */}
          <Dropdown
            menu={{ items: menuItems }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  textAlign: "right",
                  lineHeight: 1.2,
                }}
                className="hidden sm:block"
              >
                <Typography.Text
                  style={{
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 14,
                    display: "block",
                  }}
                >
                  {user?.fullName || "Người dùng"}
                </Typography.Text>

                <Typography.Text
                  style={{
                    color: "#c7cba0",
                    fontSize: 11,
                  }}
                >
                  {user?.roleName || "Chưa xác định"}
                </Typography.Text>
              </div>

              <Avatar
                size={40}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: "#6b7330",
                  flexShrink: 0,
                }}
              />
            </div>
          </Dropdown>
        </div>

        <style jsx global>{`
          @keyframes bellPulse {
            0% {
              transform: scale(0.8);
              opacity: 0.8;
            }

            50% {
              transform: scale(1.3);
              opacity: 0;
            }

            100% {
              transform: scale(0.8);
              opacity: 0.8;
            }
          }

          @keyframes bellShake {
            0%,
            100% {
              transform: rotate(0deg);
            }

            15% {
              transform: rotate(14deg);
            }

            30% {
              transform: rotate(-12deg);
            }

            45% {
              transform: rotate(10deg);
            }

            60% {
              transform: rotate(-8deg);
            }

            75% {
              transform: rotate(4deg);
            }
          }
        `}</style>
      </Header>
    </>
  )
}