/**
 * File: app/permissions/page.tsx
 * Mô tả: Trang quản lý quyền - bật/tắt quyền theo PermissionLevel
 * Cập nhật: 2026-07-21
 * 
 * Logic phân quyền:
 *   - PermissionLevel = 2 → có quyền (Thêm, Sửa, Xóa, Nhập/Xuất Excel)
 *   - PermissionLevel = 3 → bị giới hạn quyền (ẩn toàn bộ chức năng)
 * 
 * Thay đổi:
 *   - Không còn toggle từng feature riêng lẻ
 *   - Chỉ 1 Toggle duy nhất: ON = PermissionLevel 2, OFF = PermissionLevel 3
 *   - Cập nhật trực tiếp cột PermissionLevel trên bảng User
 *   - Optimistic update, rollback nếu API lỗi
 */

"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { App, Button, Card, Col, Layout, Row, Spin, Switch, Table, Tag, Typography } from "antd"
import { ArrowLeftOutlined, SettingOutlined, UserOutlined, TeamOutlined } from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"

import { AppHeader } from "@/components/app-header"
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

// PermissionLevel = 2 → có quyền, PermissionLevel = 3 → không quyền
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

  // Bật/tắt quyền - cập nhật PermissionLevel trực tiếp
  // Toggle ON → PermissionLevel = 2 (có quyền)
  // Toggle OFF → PermissionLevel = 3 (bị giới hạn)
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
    // Lấy user đăng nhập từ localStorage
    const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}")

    if (!loggedInUser.userId) {
      message.error("Không tìm thấy thông tin người đăng nhập")
      return
    }

    setLoadingSwitches(prev => new Set(prev).add(targetUserId))

    const oldUsers = [...subordinateUsers]
    const newPermissionLevel = enablePermission ? PERMISSION_LEVEL_GRANTED : PERMISSION_LEVEL_RESTRICTED

    // Optimistic update - cập nhật PermissionLevel ngay lập tức
    setSubordinateUsers(prev =>
      prev.map(item => {
        if (item.UserID === targetUserId) {
          return {
            ...item,
            PermissionLevel: newPermissionLevel,
          }
        }
        return item
      })
    )

    try {
      const response = await fetch("/api/permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        enablePermission
          ? "Đã cấp quyền cho user."
          : "Đã tắt quyền của user."
      )

      // Broadcast cập nhật để các tab khác biết permission đã thay đổi
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

      // Rollback về trạng thái cũ
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

  // Kiểm tra xem user hiện tại có quyền quản lý không
  // Logic: Chỉ user có PermissionLevel < 3 mới có quyền quản lý
  // PermissionLevel: 1=Sư đoàn, 2=Trung đoàn, 3+=Tiểu đoàn trở xuống
  const canManage = user && user.permissionLevel < 3

  // ============================================================
  // RENDER
  // ============================================================

  if (authLoading || !user) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <AppHeader />
        <Content style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Spin size="large" />
        </Content>
      </Layout>
    )
  }

  if (loading) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <AppHeader />
        <Content style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Spin size="large" />
          <Typography.Text style={{ marginLeft: 12 }}>Đang tải dữ liệu...</Typography.Text>
        </Content>
      </Layout>
    )
  }

  // Nếu user không có quyền quản lý
  if (!canManage) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <AppHeader />
        <Content style={{ padding: "24px 32px", background: "#f3f4ec" }}>
          <Card>
            <div style={{ textAlign: "center", padding: 40 }}>
              <SettingOutlined style={{ fontSize: 48, color: "#8c8c8c", marginBottom: 16 }} />
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
        </Content>
      </Layout>
    )
  }

  // Columns cho bảng
  const columns: ColumnsType<UserPermission> = [
    {
      title: "Thông tin user",
      key: "userInfo",
      width: 250,
      render: (_, record) => (
        <div>
          <Typography.Text strong>{record.FullName}</Typography.Text>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.Username}
          </Typography.Text>
          <div style={{ marginTop: 4 }}>
            <Tag color="blue">{record.RoleName}</Tag>
            <Tag>{record.UnitName}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: "Trạng thái quyền",
      key: "permissionStatus",
      width: 150,
      align: "center" as const,
      render: (_: any, record: UserPermission) => {
        const hasPermission = record.PermissionLevel === PERMISSION_LEVEL_GRANTED
        return (
          <Tag color={hasPermission ? "green" : "red"}>
            {hasPermission ? "Có quyền" : "Bị giới hạn"}
          </Tag>
        )
      },
    },
    {
      title: (
        <div style={{ textAlign: "center", fontWeight: 600 }}>
          Cấp quyền
        </div>
      ),
      key: "toggle",
      width: 120,
      align: "center" as const,
      render: (_: any, record: UserPermission) => {
        // User có quyền khi PermissionLevel = 2
        const hasPermission = record.PermissionLevel === PERMISSION_LEVEL_GRANTED
        const isLoading = loadingSwitches.has(record.UserID)
        
        return (
          <Switch
            checked={hasPermission}
            loading={isLoading}
            onChange={(checked) => handleTogglePermission(record.UserID, checked)}
            checkedChildren="Bật"
            unCheckedChildren="Tắt"
          />
        )
      },
    },
  ]

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <AppHeader />

      <Content style={{ padding: "24px 32px", background: "#f3f4ec" }}>
        {/* Header */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push("/")}
            >
              Quay lại
            </Button>
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>
                <SettingOutlined style={{ marginRight: 8 }} />
                Quản lý quyền truy cập
              </Typography.Title>
              <Typography.Text type="secondary">
                Bật/tắt quyền cho các tài khoản cấp dưới (PermissionLevel 2/3)
              </Typography.Text>
            </div>
          </div>
        </Card>

        {/* Thông tin user hiện tại */}
        <Card size="small" style={{ marginBottom: 16, background: "#f6ffed", borderColor: "#b7eb8f" }}>
          <Row gutter={16}>
            <Col>
              <Typography.Text strong>Tài khoản của bạn:</Typography.Text>
            </Col>
            <Col>
              <Tag color="blue" icon={<UserOutlined />}>{currentUser?.FullName}</Tag>
            </Col>
            <Col>
              <Tag>{currentUser?.RoleName}</Tag>
            </Col>
            <Col>
              <Tag color="green">{currentUser?.UnitName}</Tag>
            </Col>
            <Col>
              <Typography.Text type="secondary">
                (Level {currentUser?.UnitLevel} - Có thể quản lý Level {(currentUser?.UnitLevel ?? 0) + 1})
              </Typography.Text>
            </Col>
          </Row>
        </Card>

        {/* Bảng danh sách user */}
        <Card
          title={
            <span>
              <TeamOutlined style={{ marginRight: 8 }} />
              Danh sách tài khoản cấp dưới ({subordinateUsers.length})
            </span>
          }
        >
          {subordinateUsers.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#8c8c8c" }}>
              <TeamOutlined style={{ fontSize: 40, marginBottom: 12 }} />
              <div>Không có tài khoản cấp dưới để quản lý</div>
            </div>
          ) : (
            <Table
              rowKey="UserID"
              columns={columns}
              dataSource={subordinateUsers}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              scroll={{ x: 1200 }}
              size="small"
            />
          )}
        </Card>

        {/* Hướng dẫn */}
        <Card size="small" style={{ marginTop: 16, background: "#e6f7ff", borderColor: "#91d5ff" }}>
          <Typography.Text strong style={{ color: "#0050b3" }}>
            Hướng dẫn:
          </Typography.Text>
          <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
            <li><strong>Bật</strong> công tắc (PermissionLevel = 2): User được quyền Thêm, Sửa, Xóa, Nhập Excel, Xuất Excel</li>
            <li><strong>Tắt</strong> công tắc (PermissionLevel = 3): User bị ẩn toàn bộ các chức năng trên</li>
            <li>Quyền được áp dụng <strong>ngay lập tức</strong> sau khi thay đổi (không cần reload)</li>
            <li>Chỉ tài khoản có PermissionLevel nhỏ hơn 3 mới có thể quản lý quyền</li>
            <li>Hệ thống tự động lọc và chỉ hiển thị các tài khoản cấp dưới trực tiếp dựa theo UnitID</li>
          </ul>
        </Card>
      </Content>
    </Layout>
  )
}