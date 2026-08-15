/**
 * File: app/permission-requests/page.tsx
 * Mô tả: Trang Yêu cầu mở quyền (Báo cáo chờ xử lý) - theo design mới
 * 7 cột + 3 nút thao tác (duyệt/từ chối/xem)
 */

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  App,
  Avatar,
  Button,
  Card,
  Input,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FilterOutlined,
  ReloadOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons"

import { PageLayout } from "@/components/page-layout"
import { useAuth } from "@/components/auth-provider"

const { TextArea } = Input
const { Title, Text } = Typography

// ============================================================
// CONSTANTS
// ============================================================

const REQUEST_STATUS_COLORS: Record<string, string> = {
  Pending: "green",
  Approved: "blue",
  Rejected: "red",
}

const REQUEST_STATUS_LABELS: Record<string, string> = {
  Pending: "Chờ duyệt",
  Approved: "Đã duyệt",
  Rejected: "Đã từ chối",
}

// ============================================================
// INTERFACES
// ============================================================

interface PermissionRequestRow {
  ID: string
  RequestID?: string
  Title: string
  StatusID: string
  StatusName?: string
  StatusDescription?: string
  RequestDate: string
  ApprovedDate?: string
  ExpiredDate?: string
  RequestByName?: string
  RequestByRank?: string
  RequestByUsername?: string
  UnitName?: string
  Description?: string
  ApprovedByName?: string
  RejectReason?: string
  RequestedByAvatar?: string
  PermissionLevel?: string
}

// ============================================================
// HELPERS
// ============================================================

function formatDate(value?: string) {
  if (!value) return "—"
  try {
    const date = new Date(value)
    const time = date.toLocaleTimeString("vi-VN", { hour12: false })
    const dateStr = date.toLocaleDateString("vi-VN")
    return `${dateStr} ${time}`
  } catch {
    return value
  }
}

function getRequestId(record: PermissionRequestRow) {
  return record.ID || record.RequestID || ""
}

function normalizeRequestStatus(status?: string | null) {
  const value = String(status || "").trim().toLowerCase()
  if (value === "pending") return "Pending"
  if (value === "approved") return "Approved"
  if (value === "rejected") return "Rejected"
  return status || ""
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PermissionRequestsPage() {
  const router = useRouter()
  const { message, modal } = App.useApp()
  const { user, isLoading, hasPermission, refreshPermissions } = useAuth()

  // Data state
  const [loading, setLoading] = useState(false)
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequestRow[]>([])
  const [searchText, setSearchText] = useState("")
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null)

  // Create request state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
  })

  const canReviewRequests = hasPermission("canApproveRequest") || (user?.permissionLevel ?? 99) < 3

  // Load data
  useEffect(() => {
    if (!isLoading && user?.userId) {
      loadPermissionRequests()
    }
  }, [user, isLoading])

  const loadPermissionRequests = async () => {
    if (!user?.userId) return
    try {
      setLoading(true)
      const response = await fetch(`/api/permission-requests?userId=${user.userId}`)
      const result = await response.json()
      if (result.success) {
        setPermissionRequests(result.data || [])
      } else {
        message.error(result.message || "Lỗi khi tải yêu cầu mở quyền")
      }
    } catch (error) {
      console.error("Lỗi khi tải yêu cầu mở quyền:", error)
      message.error("Lỗi kết nối server")
    } finally {
      setLoading(false)
    }
  }

  const reviewRequest = async (
    record: PermissionRequestRow,
    action: "approve" | "reject",
    rejectReason?: string
  ) => {
    if (!user?.userId) return
    const id = getRequestId(record)
    if (!id) return

    try {
      setReviewingRequestId(id)
      const response = await fetch(`/api/permission-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, approvedBy: user.userId, rejectReason }),
      })
      const result = await response.json()
      if (result.success) {
        message.success(result.message || "Đã xử lý yêu cầu")
        if (action === "approve" && result.affectedUserId) {
          const permissionLevel = result.permissionLevel || 2

          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            const channel = new BroadcastChannel("permission-updates")
            channel.postMessage({
              type: "permission_update",
              userId: result.affectedUserId,
              permissionLevel,
            })
            channel.close()
          }

          window.dispatchEvent(
            new CustomEvent("permission_update", {
              detail: { userId: result.affectedUserId, permissionLevel },
            })
          )
        }
        await refreshPermissions()
        await loadPermissionRequests()
      } else {
        message.error(result.message || "Lỗi khi xử lý yêu cầu")
      }
    } catch (error) {
      console.error("Lỗi khi xét duyệt yêu cầu:", error)
      message.error("Lỗi khi xử lý yêu cầu")
    } finally {
      setReviewingRequestId(null)
    }
  }

  const handleApprove = (record: PermissionRequestRow) => {
    modal.confirm({
      title: "Xác nhận phê duyệt yêu cầu",
      icon: <ExclamationCircleOutlined />,
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Text>Bạn có chắc chắn muốn phê duyệt yêu cầu mở quyền này?</Text>
          <Text type="secondary">
            Người yêu cầu: {record.RequestByName || "—"}
          </Text>
          <Text type="secondary">
            Nội dung: {record.Title || record.Description || "Yêu cầu mở tất cả quyền chức năng"}
          </Text>
        </div>
      ),
      okText: "Phê duyệt",
      cancelText: "Huỷ",
      onOk: () => reviewRequest(record, "approve"),
    })
  }

  const handleReject = (record: PermissionRequestRow) => {
    let reason = ""
    modal.confirm({
      title: "Từ chối yêu cầu mở quyền",
      content: (
        <TextArea
          rows={4}
          placeholder="Nhập lý do từ chối"
          onChange={(event) => {
            reason = event.target.value
          }}
        />
      ),
      okText: "Từ chối",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: () => reviewRequest(record, "reject", reason),
    })
  }

  const handleView = (record: PermissionRequestRow) => {
    modal.info({
      title: "Chi tiết yêu cầu mở quyền",
      width: 600,
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <Text type="secondary">Mã yêu cầu:</Text>
            <div style={{ fontWeight: 500 }}>{getRequestId(record)}</div>
          </div>
          <div>
            <Text type="secondary">Người yêu cầu:</Text>
            <div style={{ fontWeight: 500 }}>{record.RequestByName || "—"}</div>
          </div>
          <div>
            <Text type="secondary">Đơn vị:</Text>
            <div style={{ fontWeight: 500 }}>{record.UnitName || "—"}</div>
          </div>
          <div>
            <Text type="secondary">Tiêu đề:</Text>
            <div style={{ fontWeight: 500 }}>{record.Title || "—"}</div>
          </div>
          <div>
            <Text type="secondary">Nội dung:</Text>
            <div>{record.Description || "—"}</div>
          </div>
          <div>
            <Text type="secondary">Thời gian yêu cầu:</Text>
            <div>{formatDate(record.RequestDate)}</div>
          </div>
          <div>
            <Text type="secondary">Trạng thái:</Text>
            <div>
              <Tag color={REQUEST_STATUS_COLORS[normalizeRequestStatus(record.StatusID)] || "default"}>
                {record.StatusName || REQUEST_STATUS_LABELS[normalizeRequestStatus(record.StatusID)] || record.StatusID}
              </Tag>
            </div>
          </div>
          {record.ApprovedByName && (
            <div>
              <Text type="secondary">Người duyệt:</Text>
              <div style={{ fontWeight: 500 }}>{record.ApprovedByName}</div>
            </div>
          )}
          {record.ApprovedDate && (
            <div>
              <Text type="secondary">Ngày duyệt:</Text>
              <div>{formatDate(record.ApprovedDate)}</div>
            </div>
          )}
          {record.RejectReason && (
            <div>
              <Text type="secondary">Lý do từ chối:</Text>
              <div style={{ color: "#ff4d4f" }}>{record.RejectReason}</div>
            </div>
          )}
        </div>
      ),
    })
  }

  const handleCreateRequest = async () => {
    if (!user?.userId) {
      message.error("Thiếu thông tin người dùng")
      return
    }

    // Kiểm tra xem user có đang bị tắt quyền chỉnh sửa không
    // Nếu permissionLevel > 3 hoặc không có quyền canEdit, không cho gửi yêu cầu
    if (!hasPermission('canEdit') && user.permissionLevel > 3) {
      message.warning("Tài khoản của bạn đã bị tắt quyền chỉnh sửa. Vui lòng liên hệ quản trị viên.")
      return
    }

    if (!createForm.title.trim()) {
      message.error("Vui lòng nhập tiêu đề yêu cầu")
      return
    }

    if (!createForm.description.trim()) {
      message.error("Vui lòng nhập nội dung yêu cầu")
      return
    }

    try {
      setCreating(true)
      const response = await fetch("/api/permission-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestBy: user.userId,
          title: createForm.title,
          content: createForm.description,
        }),
      })
      const result = await response.json()
      if (result.success) {
        message.success("Đã tạo yêu cầu mở quyền thành công")
        setCreateModalOpen(false)
        setCreateForm({ title: "", description: "" })
        await loadPermissionRequests()
      } else {
        message.error(result.message || "Lỗi khi tạo yêu cầu")
      }
    } catch (error) {
      console.error("Lỗi khi tạo yêu cầu:", error)
      message.error("Lỗi kết nối server")
    } finally {
      setCreating(false)
    }
  }

  if (isLoading || !user) {
    return (
      <PageLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400 }}>
          <Text>Đang kiểm tra phiên đăng nhập...</Text>
        </div>
      </PageLayout>
    )
  }

  // Filter data theo search
  const filteredRequests = searchText.trim()
    ? permissionRequests.filter(
        (r) =>
          r.RequestByName?.toLowerCase().includes(searchText.toLowerCase()) ||
          r.Title?.toLowerCase().includes(searchText.toLowerCase()) ||
          r.Description?.toLowerCase().includes(searchText.toLowerCase()) ||
          r.UnitName?.toLowerCase().includes(searchText.toLowerCase())
      )
    : permissionRequests

  // ============================================================
  // TABLE COLUMNS
  // ============================================================

  const columns: ColumnsType<PermissionRequestRow> = [
    {
      title: "Thời gian yêu cầu",
      dataIndex: "RequestDate",
      width: 180,
      render: (date: string) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 13 }}>{formatDate(date)}</Text>
        </div>
      ),
    },
    {
      title: "Người yêu cầu",
      key: "requester",
      width: 220,
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar size={36} style={{ background: "#4b5320", flexShrink: 0 }}>
            {record.RequestByName?.charAt(0)}
          </Avatar>
          <div>
            {record.RequestByRank && (
              <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                {record.RequestByRank}
              </Text>
            )}
            <Text strong style={{ display: "block", fontSize: 13 }}>
              {record.RequestByName || "—"}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.RequestByUsername}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Đơn vị",
      dataIndex: "UnitName",
      width: 160,
      render: (unit: string) => <Text style={{ fontSize: 13 }}>{unit || "—"}</Text>,
    },
    {
      title: "Nội dung yêu cầu",
      key: "content",
      render: (_, record) => (
        <div>
          <Text strong style={{ display: "block", fontSize: 13 }}>
            {record.Title || "Mở quyền chức năng"}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.Description || "Yêu cầu mở tất cả quyền chức năng"}
          </Text>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Mã yêu cầu: {getRequestId(record)}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Cấp quyền đề nghị",
      key: "permissionLevel",
      width: 160,
      align: "center",
      render: (_, record) => (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <SafetyCertificateOutlined style={{ fontSize: 20, color: "#3a4d2e" }} />
          <Text style={{ fontSize: 12 }}>{record.UnitName || "—"}</Text>
          <Tag color="blue" style={{ fontSize: 11 }}>
            {record.PermissionLevel || "Toàn quyền"}
          </Tag>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "StatusID",
      width: 130,
      align: "center",
      render: (status: string, record) => {
        const normalizedStatus = normalizeRequestStatus(status)
        return (
          <Tag
            color={REQUEST_STATUS_COLORS[normalizedStatus] || "default"}
            style={{ fontSize: 12 }}
          >
            {record.StatusName || REQUEST_STATUS_LABELS[normalizedStatus] || status}
          </Tag>
        )
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 100,
      align: "center",
      render: (_, record) => {
        const requestId = getRequestId(record)
        const status = normalizeRequestStatus(record.StatusID)

        if (status === "Pending" && canReviewRequests) {
          return (
            <Space size={4}>
              <Button
                type="text"
                size="small"
                icon={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
                loading={reviewingRequestId === requestId}
                onClick={(e) => { e.stopPropagation(); handleApprove(record) }}
                title="Phê duyệt"
              />
              <Button
                type="text"
                size="small"
                icon={<CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
                loading={reviewingRequestId === requestId}
                onClick={(e) => { e.stopPropagation(); handleReject(record) }}
                title="Từ chối"
              />
            </Space>
          )
        }

        return null
      },
    },
  ]

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <PageLayout>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <Title level={3} style={{ margin: 0, color: "#212121" }}>
              Yêu cầu cấp quyền
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Quản lý các yêu cầu mở quyền truy cập trong hệ thống
            </Text>
          </div>
          <Space>
            <Input
              placeholder="Tìm kiếm người yêu cầu, nội dung..."
              prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 280, borderRadius: 8 }}
              allowClear
            />
            <Button icon={<FilterOutlined />}>Bộ lọc</Button>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={loadPermissionRequests}
              style={{ background: "#3a4d2e", borderColor: "#3a4d2e" }}
            >
              Làm mới
            </Button>
            {user?.userId !== 'U002' && (hasPermission('canEdit') || user.permissionLevel <= 3) && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalOpen(true)}
                style={{ background: "#3a4d2e", borderColor: "#3a4d2e" }}
              >
                Tạo yêu cầu
              </Button>
            )}
          </Space>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="requests"
        style={{ marginBottom: 16 }}
        items={[
          {
            key: "requests",
            label: (
              <span>
                Yêu cầu mở quyền ({filteredRequests.length})
              </span>
            ),
          },
        ]}
      />

      {/* Table */}
      <Card style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        <Table
          rowKey={(record) => getRequestId(record)}
          columns={columns}
          dataSource={filteredRequests}
          loading={loading}
          onRow={(record) => ({
            onClick: () => handleView(record),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `Hiển thị ${range[0]} - ${range[1]} của ${total} yêu cầu`,
          }}
          scroll={{ x: 1300 }}
          size="middle"
        />
      </Card>

      {/* Create Request Modal */}
      <Modal
        title="Tạo yêu cầu mở quyền"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false)
          setCreateForm({ title: "", description: "" })
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setCreateModalOpen(false)
              setCreateForm({ title: "", description: "" })
            }}
          >
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={creating}
            onClick={handleCreateRequest}
            style={{ background: "#3a4d2e", borderColor: "#3a4d2e" }}
          >
            Tạo yêu cầu
          </Button>,
        ]}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Tiêu đề yêu cầu <span style={{ color: "#ff4d4f" }}>*</span>
            </Text>
            <Input
              placeholder="Nhập tiêu đề yêu cầu"
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
            />
          </div>
          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Nội dung yêu cầu <span style={{ color: "#ff4d4f" }}>*</span>
            </Text>
            <TextArea
              rows={4}
              placeholder="Mô tả chi tiết yêu cầu mở quyền của bạn"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            />
          </div>
          <div style={{ padding: 12, background: "#f6ffed", borderRadius: 8, border: "1px solid #b7eb8f" }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <SafetyCertificateOutlined style={{ marginRight: 4 }} />
              Yêu cầu của bạn sẽ được gửi đến quản trị viên để phê duyệt. Bạn sẽ nhận được thông báo khi có kết quả.
            </Text>
          </div>
        </div>
      </Modal>
    </PageLayout>
  )
}
