/**
 * File: app/permissions/page.tsx
 * Mô tả: Trang quản lý quyền truy cập - theo design mới
 * Chỉ giữ tab "Quản lý người dùng", bỏ nút Thêm người dùng, bỏ cột Thao tác
 */

"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { App, Avatar, Button, Card, Input, Layout, Modal, Spin, Switch, Table, Tabs, Tag, Typography } from "antd"
import {
  SearchOutlined,
  FilterOutlined,
  SettingOutlined,
  UserOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  HistoryOutlined,
  EditOutlined,
  MoreOutlined,
} from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"

import { PageLayout } from "@/components/page-layout"
import { useAuth } from "@/components/auth-provider"

const { Content } = Layout

// ============================================================
// INTERFACES
// ============================================================

interface UserPermission {
  UserID: string
  FullName: string
  Username: string
  RoleID: string
  RoleName: string
  UnitID: string
  PermissionLevel: number
  UnitName?: string
  UnitLevel?: number
  UnitFullPath?: string
  PhotoPath?: string
}

interface CurrentUser {
  UserID: string
  FullName: string
  RoleID: string
  RoleName: string
  UnitID: string
  UnitName: string
  UnitLevel: number
  HierarchyPath: string
  PermissionLevel: number
}

// ============================================================
// CONSTANTS
// ============================================================

const PERMISSION_LEVEL_GRANTED = 2
const PERMISSION_LEVEL_RESTRICTED = 3

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PermissionsPage() {
  const router = useRouter()
  const { message, modal } = App.useApp()
  const { user, isLoading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [subordinateUsers, setSubordinateUsers] = useState<UserPermission[]>([])
  const [loadingSwitches, setLoadingSwitches] = useState<Set<string>>(new Set())
  const [searchText, setSearchText] = useState("")

  // Load danh sách user cấp dưới
  useEffect(() => {
    if (!authLoading && user?.userId) {
      loadSubordinateUsers()
    }
  }, [user, authLoading])

  const loadSubordinateUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/permissions/users?userId=${user?.userId}`)
      const result = await response.json()

      if (result.success) {
        setCurrentUser(result.data.currentUser)
        setSubordinateUsers(result.data.subordinateUsers)
      } else {
        message.error(result.message || "Lỗi khi tải dữ liệu")
      }
    } catch (error) {
      console.error("Lỗi:", error)
      message.error("Lỗi kết nối server")
    } finally {
      setLoading(false)
    }
  }

  // Bật/tắt quyền
  const handleTogglePermission = useCallback(async (
    targetUserId: string,
    enablePermission: boolean
  ) => {
    if (!enablePermission) {
      modal.confirm({
        title: "Xác nhận tắt quyền",
        content: "Bạn có chắc chắn muốn tắt quyền cho user này? User sẽ bị ẩn các chức năng: Thêm, Sửa, Xóa, Nhập Excel, Xuất Excel.",
        okText: "Tắt",
        okType: "danger",
        cancelText: "Huỷ",
        onOk: () => togglePermissionLevel(targetUserId, enablePermission),
      })
    } else {
      togglePermissionLevel(targetUserId, enablePermission)
    }
  }, [modal])

  const togglePermissionLevel = async (
    targetUserId: string,
    enablePermission: boolean
  ) => {
    const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}")

    if (!loggedInUser.userId) {
      message.error("Không tìm thấy thông tin người đăng nhập")
      return
    }

    setLoadingSwitches(prev => new Set(prev).add(targetUserId))

    const oldUsers = [...subordinateUsers]
    const newPermissionLevel = enablePermission ? PERMISSION_LEVEL_GRANTED : PERMISSION_LEVEL_RESTRICTED

    // Optimistic update
    setSubordinateUsers(prev =>
      prev.map(item => {
        if (item.UserID === targetUserId) {
          return { ...item, PermissionLevel: newPermissionLevel }
        }
        return item
      })
    )

    try {
      const response = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grantedByUserId: loggedInUser.userId,
          grantedToUserId: targetUserId,
          featureCode: "all",
          isEnabled: enablePermission,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message)
      }

      message.success(
        enablePermission ? "Đã cấp quyền cho user." : "Đã tắt quyền của user."
      )

      // Broadcast cập nhật
      if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel("permission-updates")
        channel.postMessage({
          type: "permission_update",
          userId: targetUserId,
          permissionLevel: newPermissionLevel,
        })
        channel.close()
      }
    } catch (error: any) {
      console.error(error)
      setSubordinateUsers(oldUsers)
      message.error(error.message || "Lỗi kết nối server")
    } finally {
      setLoadingSwitches(prev => {
        const next = new Set(prev)
        next.delete(targetUserId)
        return next
      })
    }
  }

  const canManage = user && user.permissionLevel < 3

  // Filter data theo search
  const filteredUsers = searchText.trim()
    ? subordinateUsers.filter(u =>
        u.FullName.toLowerCase().includes(searchText.toLowerCase()) ||
        u.Username.toLowerCase().includes(searchText.toLowerCase()) ||
        u.UnitName?.toLowerCase().includes(searchText.toLowerCase())
      )
    : subordinateUsers

  // ============================================================
  // RENDER
  // ============================================================

  if (authLoading || !user) {
    return (
      <PageLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400 }}>
          <Spin size="large" />
        </div>
      </PageLayout>
    )
  }

  if (loading) {
    return (
      <PageLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400 }}>
          <Spin size="large" />
          <Typography.Text style={{ marginLeft: 12 }}>Đang tải dữ liệu...</Typography.Text>
        </div>
      </PageLayout>
    )
  }

  if (!canManage) {
    return (
      <PageLayout>
        <Card>
          <div style={{ textAlign: "center", padding: 40 }}>
            <SafetyCertificateOutlined style={{ fontSize: 48, color: "#8c8c8c", marginBottom: 16 }} />
            <Typography.Title level={4}>Bạn không có quyền truy cập</Typography.Title>
            <Typography.Text type="secondary">
              Chỉ tài khoản có PermissionLevel nhỏ hơn 3 mới có thể quản lý quyền
            </Typography.Text>
            <div style={{ marginTop: 24 }}>
              <Button type="primary" onClick={() => router.push("/")}>
                Quay về trang chủ
              </Button>
            </div>
          </div>
        </Card>
      </PageLayout>
    )
  }

  // Columns cho bảng
  const columns: ColumnsType<UserPermission> = [
    {
      title: "Thông tin người dùng",
      key: "userInfo",
      width: 280,
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar
            size={40}
            src={record.PhotoPath || undefined}
            style={{ background: "#4b5320", flexShrink: 0 }}
          >
            {record.FullName?.charAt(0)}
          </Avatar>
          <div>
            <Typography.Text strong style={{ display: "block", fontSize: 13 }}>
              {record.FullName}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {record.Username}
            </Typography.Text>
            <div style={{ marginTop: 4 }}>
              <Tag color="blue" style={{ fontSize: 11 }}>{record.RoleName}</Tag>
              <Tag style={{ fontSize: 11 }}>{record.UnitName}</Tag>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Đơn vị quản lý",
      key: "unit",
      width: 200,
      render: (_, record) => (
        <Typography.Text style={{ fontSize: 13 }}>
          {record.UnitName || "—"}
        </Typography.Text>
      ),
    },
    {
      title: "Vai trò",
      key: "role",
      width: 180,
      render: (_, record) => (
        <Tag color="blue" style={{ fontSize: 12 }}>
          {record.RoleName || "—"}
        </Tag>
      ),
    },
    {
      title: "Trạng thái quyền",
      key: "permissionStatus",
      width: 140,
      align: "center",
      render: (_, record) => {
        const hasPermission = record.PermissionLevel === PERMISSION_LEVEL_GRANTED
        return (
          <Tag color={hasPermission ? "success" : "error"} style={{ fontSize: 12 }}>
            {hasPermission ? "Có quyền" : "Đã giới hạn"}
          </Tag>
        )
      },
    },
    {
      title: "Cấp quyền",
      key: "toggle",
      width: 160,
      align: "center",
      render: (_, record) => {
        const hasPermission = record.PermissionLevel === PERMISSION_LEVEL_GRANTED
        const isLoading = loadingSwitches.has(record.UserID)

        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
            <Typography.Text style={{ fontSize: 12, color: "#666" }}>
              {hasPermission ? "Đọc / Ghi" : "Chỉ đọc"}
            </Typography.Text>
            <Switch
              checked={hasPermission}
              loading={isLoading}
              onChange={(checked) => handleTogglePermission(record.UserID, checked)}
              size="small"
            />
          </div>
        )
      },
    },
  ]

  return (
    <PageLayout>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <SafetyCertificateOutlined style={{ fontSize: 24, color: "#3a4d2e" }} />
          <div>
            <Typography.Title level={3} style={{ margin: 0, color: "#212121" }}>
              Quản lý quyền truy cập
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              Quản lý tài khoản, phân quyền truy cập và bảo mật hệ thống
            </Typography.Text>
          </div>
        </div>
      </div>

      {/* User context banner */}
      <Card
        size="small"
        style={{
          marginBottom: 16,
          background: "#f6ffed",
          borderColor: "#b7eb8f",
          borderRadius: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Typography.Text strong>Tài khoản của bạn:</Typography.Text>
          <Tag color="green" icon={<UserOutlined />}>
            {currentUser?.FullName}
          </Tag>
          <Tag>{currentUser?.RoleName}</Tag>
          <Tag color="blue">{currentUser?.UnitName}</Tag>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            (Level {currentUser?.UnitLevel} – Có thể quản lý Level {(currentUser?.UnitLevel ?? 0) + 1})
          </Typography.Text>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="users"
        style={{ marginBottom: 16 }}
        items={[
          {
            key: "users",
            label: (
              <span>
                <TeamOutlined /> Quản lý người dùng
              </span>
            ),
          },
          {
            key: "roles",
            label: (
              <span>
                <SafetyCertificateOutlined /> Quản lý vai trò
              </span>
            ),
            disabled: true,
          },
          {
            key: "matrix",
            label: (
              <span>
                <SettingOutlined /> Ma trận quyền
              </span>
            ),
            disabled: true,
          },
          {
            key: "log",
            label: (
              <span>
                <HistoryOutlined /> Nhật ký hoạt động
              </span>
            ),
            disabled: true,
          },
        ]}
      />

      {/* Search & Filter */}
      <Card style={{ marginBottom: 16, borderRadius: 8 }} styles={{ body: { padding: "14px 16px" } }}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <Input
            placeholder="Tìm kiếm người dùng..."
            prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 280, borderRadius: 8 }}
            allowClear
          />
          <Button icon={<FilterOutlined />}>Bộ lọc</Button>
        </div>
      </Card>

      {/* Table */}
      <Card
        title={
          <span>
            <TeamOutlined style={{ marginRight: 8 }} />
            Danh sách tài khoản cấp dưới ({filteredUsers.length})
          </span>
        }
        style={{ borderRadius: 8 }}
      >
        {filteredUsers.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#8c8c8c" }}>
            <TeamOutlined style={{ fontSize: 40, marginBottom: 12 }} />
            <div>Không có tài khoản cấp dưới để quản lý</div>
          </div>
        ) : (
          <Table
            rowKey="UserID"
            columns={columns}
            dataSource={filteredUsers}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 1000 }}
            size="middle"
          />
        )}
      </Card>
    </PageLayout>
  )
}
