/**
 * File: app/permissions/page.tsx
 * Mô tả: Trang quản lý quyền chi tiết cho từng tính năng
 * Cập nhật: 2026-07-03
 * 
 * Thay đổi:
 *   - Dùng optimistic update (không reload trang khi bật/tắt)
 *   - Hiển thị loading state cho từng switch
 *   - Cập nhật UI ngay lập tức, rollback nếu API lỗi
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
  permissions: Record<string, boolean>
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

// Danh sách tính năng
const FEATURES = [
  { code: 'canCreate', name: 'Thêm chiến sĩ', icon: '➕' },
  { code: 'canEdit', name: 'Sửa chiến sĩ', icon: '✏️' },
  { code: 'canDelete', name: 'Xoá chiến sĩ', icon: '🗑️' },
  { code: 'canExport', name: 'Xuất Excel', icon: '📤' },
  { code: 'canImport', name: 'Nhập Excel', icon: '📥' },
]

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

  // Cập nhật permission với optimistic update
  const handleTogglePermission = useCallback(async (
    targetUserId: string,
    featureCode: string,
    isEnabled: boolean
  ) => {
    // Hiển thị confirm khi tắt quyền
    if (!isEnabled) {
      modal.confirm({
        title: "Xác nhận tắt quyền",
        content: `Bạn có chắc chắn muốn tắt quyền "${getFeatureName(featureCode)}" cho user này?`,
        okText: "Tắt",
        okType: "danger",
        cancelText: "Huỷ",
        onOk: () => togglePermission(targetUserId, featureCode, isEnabled),
      })
    } else {
      togglePermission(targetUserId, featureCode, isEnabled)
    }
  }, [modal])

  // Bật/tắt TẤT CẢ quyền cùng lúc
  const handleToggleAllPermissions = useCallback(async (
    targetUserId: string,
    enableAll: boolean
  ) => {
    const action = enableAll ? "bật" : "tắt"
    modal.confirm({
      title: `Xác nhận ${action} tất cả quyền`,
      content: `Bạn có chắc chắn muốn ${action} TẤT CẢ quyền cho user này?`,
      okText: enableAll ? "Bật tất cả" : "Tắt tất cả",
      okType: enableAll ? "primary" : "danger",
      cancelText: "Huỷ",
      onOk: async () => {
        // Cập nhật từng quyền một
        for (const feature of FEATURES) {
          await togglePermission(targetUserId, feature.code, enableAll)
        }
      },
    })
  }, [modal])

  const togglePermission = async (
    targetUserId: string,
    featureCode: string,
    isEnabled: boolean
  ) => {
    // Optimistic update: cập nhật UI ngay lập tức
    const switchKey = `${targetUserId}-${featureCode}`
    setLoadingSwitches(prev => new Set(prev).add(switchKey))

    // Lưu trạng thái cũ để rollback nếu lỗi
    const oldUsers = [...subordinateUsers]
    
    // Cập nhật state ngay lập tức
    setSubordinateUsers(prev => 
      prev.map(user => {
        if (user.UserID === targetUserId) {
          return {
            ...user,
            permissions: {
              ...user.permissions,
              [featureCode]: isEnabled,
            },
          }
        }
        return user
      })
    )

    try {
      const response = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grantedByUserId: user?.userId,
          grantedToUserId: targetUserId,
          featureCode,
          isEnabled,
        }),
      })

      const result = await response.json()

      if (result.success) {
        message.success(result.message)
        
        // Broadcast permission update qua BroadcastChannel
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const channel = new BroadcastChannel('permission-updates')
          
          // Gửi thông báo cho user bị ảnh hưởng
          channel.postMessage({
            type: 'permission_update',
            userId: targetUserId,
            permissions: {
              ...subordinateUsers.find(u => u.UserID === targetUserId)?.permissions,
              [featureCode]: isEnabled,
            },
          })
          
          channel.close()
        }
        
        // Fallback: Dispatch custom event cho cùng tab
        window.dispatchEvent(new CustomEvent('permission_update', { 
          detail: { 
            userId: targetUserId, 
            permissions: { [featureCode]: isEnabled }
          } 
        }))
      } else {
        // Rollback nếu lỗi
        setSubordinateUsers(oldUsers)
        message.error(result.message || "Lỗi khi cập nhật")
      }
    } catch (error) {
      console.error("Lỗi:", error)
      // Rollback nếu lỗi
      setSubordinateUsers(oldUsers)
      message.error("Lỗi kết nối server")
    } finally {
      setLoadingSwitches(prev => {
        const next = new Set(prev)
        next.delete(switchKey)
        return next
      })
    }
  }

  const getFeatureName = (code: string) => {
    return FEATURES.find(f => f.code === code)?.name || code
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
      title: (
        <div style={{ textAlign: "center", fontWeight: 600 }}>
          Tất cả
        </div>
      ),
      key: "all",
      width: 100,
      align: "center" as const,
      render: (_: any, record: UserPermission) => {
        // Check nếu TẤT CẢ quyền đều bật
        const allEnabled = FEATURES.every(f => record.permissions[f.code] === true)
        const switchKey = `${record.UserID}-all`
        const isLoading = FEATURES.some(f => loadingSwitches.has(`${record.UserID}-${f.code}`))
        
        return (
          <Switch
            checked={allEnabled}
            loading={isLoading}
            onChange={(checked) => handleToggleAllPermissions(record.UserID, checked)}
            checkedChildren="Bật"
            unCheckedChildren="Tắt"
          />
        )
      },
    },
    // Các cột cho từng tính năng
    ...FEATURES.map(feature => ({
      title: (
        <div style={{ textAlign: "center" }}>
          <span style={{ marginRight: 4 }}>{feature.icon}</span>
          {feature.name}
        </div>
      ),
      key: feature.code,
      width: 120,
      align: "center" as const,
      render: (_: any, record: UserPermission) => {
        const isEnabled = record.permissions[feature.code] ?? false
        const switchKey = `${record.UserID}-${feature.code}`
        const isLoading = loadingSwitches.has(switchKey)
        
        return (
          <Switch
            checked={isEnabled}
            loading={isLoading}
            onChange={(checked) => handleTogglePermission(record.UserID, feature.code, checked)}
            checkedChildren="Bật"
            unCheckedChildren="Tắt"
          />
        )
      },
    })),
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
                Bật/tắt tính năng cho các tài khoản cấp dưới
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
            💡 Hướng dẫn:
          </Typography.Text>
          <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
            <li>Bật/tắt công tắc để cấp hoặc thu hồi quyền cho từng user</li>
            <li>Quyền sẽ được áp dụng <strong>ngay lập tức</strong> sau khi thay đổi (không cần reload)</li>
            <li>Chỉ tài khoản có PermissionLevel nhỏ hơn 3 mới có thể quản lý quyền</li>
            <li>Tài khoản PermissionLevel từ 3 trở lên (Tiểu đoàn, Đại đội...) không thể quản lý quyền</li>
            <li>Hệ thống tự động lọc và chỉ hiển thị các tài khoản cấp dưới trực tiếp dựa theo UnitID</li>
          </ul>
        </Card>
      </Content>
    </Layout>
  )
}