"use client"

import { Avatar, Layout, Typography } from "antd"
import { UserOutlined, SafetyCertificateFilled } from "@ant-design/icons"

const { Header } = Layout

export function AppHeader() {
  return (
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
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: "#6b7330",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <SafetyCertificateFilled style={{ fontSize: 24, color: "#fff" }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <Typography.Text
            style={{ color: "#fff", fontWeight: 700, fontSize: 16, display: "block", lineHeight: 1.2 }}
            ellipsis
          >
            Hồ sơ binh sĩ
          </Typography.Text>
          <Typography.Text
            style={{ color: "#c7cba0", fontSize: 11, display: "block", lineHeight: 1.2 }}
            ellipsis
          >
            Hệ thống quản lý Quân lực
          </Typography.Text>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ textAlign: "right", lineHeight: 1.2 }} className="hidden sm:block">
          <Typography.Text style={{ color: "#fff", fontWeight: 600, fontSize: 14, display: "block" }}>
            Tạ Văn Cường
          </Typography.Text>
          <Typography.Text style={{ color: "#c7cba0", fontSize: 11 }}>Administrator</Typography.Text>
        </div>
        <Avatar
          size={40}
          icon={<UserOutlined />}
          style={{ backgroundColor: "#6b7330", flexShrink: 0 }}
        />
      </div>
    </Header>
  )
}
