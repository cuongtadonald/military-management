"use client"

import { useEffect, useMemo, useState } from "react"
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import { CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, FilterOutlined } from "@ant-design/icons"
import { useAuth } from "@/components/auth-provider"
import dayjs from "dayjs"

const { TextArea } = Input

const CHANGE_TYPE_LABELS: Record<string, string> = {
  INSERT: "Thêm mới",
  UPDATE: "Cập nhật",
  DELETE: "Xoá",
  PERMISSION: "Cấp/thu hồi quyền",
  REQUEST: "Gửi yêu cầu",
  APPROVE: "Phê duyệt",
  REJECT: "Từ chối",
}

const CHANGE_TYPE_COLORS: Record<string, string> = {
  INSERT: "green",
  UPDATE: "blue",
  DELETE: "red",
  PERMISSION: "purple",
  REQUEST: "orange",
  APPROVE: "green",
  REJECT: "red",
}

const REQUEST_STATUS_COLORS: Record<string, string> = {
  Pending: "orange",
  Approved: "green",
  Rejected: "red",
}

const REQUEST_STATUS_LABELS: Record<string, string> = {
  Pending: "Chờ duyệt",
  Approved: "Đã duyệt",
  Rejected: "Đã từ chối",
}

function normalizeRequestStatus(status?: string | null) {
  const value = String(status || "").trim().toLowerCase()
  if (value === "pending") return "Pending"
  if (value === "approved") return "Approved"
  if (value === "rejected") return "Rejected"
  return status || ""
}

interface ChangeHistoryRow {
  ID: string
  ChangeHistoryID?: string
  ChangeDate: string
  ChangeType: string
  TotalSoldier?: number
  ChangeReason?: string
  ChangedByName?: string
  UnitName?: string
  Description?: string
}

interface ChangeHistoryDetailRow {
  DetailID: string
  SoldierID?: string | null
  SoldierName?: string | null
  CitizenID?: string | null
  UnitName?: string | null
  FullPathName?: string | null
  UnitFullPath?: string | null
  RankName?: string | null
  FieldName: string
  FieldDisplayName?: string
  OldValue?: string | null
  NewValue?: string | null
}

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
  UnitName?: string
  Description?: string
  ApprovedByName?: string
  RejectReason?: string
}

interface HistoryDetailResponse {
  header: any | null
  details: ChangeHistoryDetailRow[]
}

function formatDate(value?: string) {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleString("vi-VN")
  } catch {
    return value
  }
}

function displayValue(value?: string | null) {
  if (value === undefined || value === null || value === "") return "—"
  return value
}

function getHistoryId(record: ChangeHistoryRow) {
  return record.ID || record.ChangeHistoryID || ""
}

function getRequestId(record: PermissionRequestRow) {
  return record.ID || record.RequestID || ""
}

function renderUnitHierarchy(unitFullPath?: string | null, unitName?: string | null) {
  if (!unitFullPath) return unitName || "—"

  const parts = unitFullPath.split(",").map((part) => part.trim()).filter(Boolean)
  if (parts.length <= 1) return <Typography.Text>{unitName || unitFullPath}</Typography.Text>

  const currentUnit = parts[parts.length - 1]
  const parentUnits = parts.slice(0, -1).join(", ")

  return (
    <div>
      {parentUnits && (
        <Typography.Text style={{ fontSize: 11, color: "#8c8c8c", display: "block", lineHeight: 1.2 }}>
          {parentUnits}
        </Typography.Text>
      )}
      <Typography.Text style={{ fontWeight: 500, display: "block", lineHeight: 1.3 }}>
        {unitName || currentUnit}
      </Typography.Text>
    </div>
  )
}

export function ChangeReportTab() {
  const { message, modal } = App.useApp()
  const { user, hasPermission, refreshPermissions } = useAuth()
  const [activeInnerTab, setActiveInnerTab] = useState("history")
  const [historyLoading, setHistoryLoading] = useState(false)
  const [requestLoading, setRequestLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [history, setHistory] = useState<ChangeHistoryRow[]>([])
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequestRow[]>([])
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedHistory, setSelectedHistory] = useState<HistoryDetailResponse | null>(null)
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null)
  const [form] = Form.useForm()

  // Filter states for History tab
  const [historySearch, setHistorySearch] = useState("")
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string | undefined>(undefined)
  const [historyDateRange, setHistoryDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)

  // Filter states for Permission Requests tab
  const [requestSearch, setRequestSearch] = useState("")
  const [requestStatusFilter, setRequestStatusFilter] = useState<string | undefined>(undefined)

  const canReviewRequests = hasPermission("canApproveRequest") || (user?.permissionLevel ?? 99) < 3

  const loadHistory = async () => {
    if (!user?.userId) return
    try {
      setHistoryLoading(true)
      const response = await fetch(`/api/change-history?userId=${user.userId}`)
      const result = await response.json()
      if (result.success) {
        setHistory(result.data || [])
      } else {
        message.error(result.message || "Lỗi khi tải lịch sử thay đổi")
      }
    } catch (error) {
      console.error("Lỗi khi tải lịch sử thay đổi:", error)
      message.error("Lỗi kết nối server")
    } finally {
      setHistoryLoading(false)
    }
  }

  const loadPermissionRequests = async () => {
    if (!user?.userId) return
    try {
      setRequestLoading(true)
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
      setRequestLoading(false)
    }
  }

  useEffect(() => {
    void loadHistory()
    void loadPermissionRequests()
  }, [user?.userId])

  const refreshAll = () => {
    void loadHistory()
    void loadPermissionRequests()
  }

  const openHistoryDetail = async (record: ChangeHistoryRow) => {
    if (!user?.userId) return
    const id = getHistoryId(record)
    if (!id) return

    try {
      setDetailModalOpen(true)
      setDetailLoading(true)
      const response = await fetch(`/api/change-history/${id}?userId=${user.userId}`)
      const result = await response.json()
      if (result.success) {
        setSelectedHistory(result.data)
      } else {
        message.error(result.message || "Lỗi khi tải chi tiết lịch sử")
      }
    } catch (error) {
      console.error("Lỗi khi tải chi tiết lịch sử:", error)
      message.error("Lỗi kết nối server")
    } finally {
      setDetailLoading(false)
    }
  }

  const handleCreateRequest = async () => {
    if (!user?.userId) return
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      const response = await fetch("/api/permission-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestBy: user.userId,
          title: values.title,
          content: values.content,
        }),
      })
      const result = await response.json()
      if (result.success) {
        message.success("Đã gửi yêu cầu mở quyền")
        form.resetFields()
        setRequestModalOpen(false)
        refreshAll()
      } else {
        message.error(result.message || "Lỗi khi gửi yêu cầu")
      }
    } catch (error: any) {
      if (!error?.errorFields) {
        console.error("Lỗi khi gửi yêu cầu mở quyền:", error)
        message.error("Lỗi khi gửi yêu cầu")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const reviewRequest = async (record: PermissionRequestRow, action: "approve" | "reject", rejectReason?: string) => {
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
          // Gửi broadcast với permissionLevel để các tab cập nhật
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

          window.dispatchEvent(new CustomEvent("permission_update", {
            detail: { userId: result.affectedUserId, permissionLevel },
          }))
        }
        await refreshPermissions()
        refreshAll()
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
          <Typography.Text>Bạn có chắc chắn muốn phê duyệt yêu cầu mở quyền này?</Typography.Text>
          <Typography.Text type="secondary">
            Người yêu cầu: {record.RequestByName || "—"}
          </Typography.Text>
          <Typography.Text type="secondary">
            Nội dung: {record.Title || record.Description || "Yêu cầu mở tất cả quyền chức năng"}
          </Typography.Text>
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

  const historyColumns: ColumnsType<ChangeHistoryRow> = useMemo(() => [
    {
      title: "Thời gian",
      dataIndex: "ChangeDate",
      width: 160,
      render: formatDate,
    },
    {
      title: "Loại",
      dataIndex: "ChangeType",
      width: 150,
      render: (type: string) => <Tag color={CHANGE_TYPE_COLORS[type] || "default"}>{CHANGE_TYPE_LABELS[type] || type}</Tag>,
    },
    {
      title: "Người thao tác",
      dataIndex: "ChangedByName",
      width: 220,
      render: (name: string, record) => (
        <div>
          <Typography.Text strong>{name || "—"}</Typography.Text>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{record.UnitName}</Typography.Text>
        </div>
      ),
    },
    {
      title: "Nội dung",
      dataIndex: "Description",
      render: (_: string, record) => (
        <div>
          <Typography.Text>{record.Description || record.ChangeReason || "—"}</Typography.Text>
          <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>Mã: {getHistoryId(record)}</Typography.Text></div>
        </div>
      ),
    },
    {
      title: "Số chiến sĩ",
      dataIndex: "TotalSoldier",
      width: 110,
      align: "center",
      render: (value: number) => value || 0,
    },
    {
      title: "Chi tiết",
      width: 100,
      align: "center",
      render: (_, record) => <Button size="small" icon={<EyeOutlined />} onClick={() => openHistoryDetail(record)}>Xem</Button>,
    },
  ], [])

  const requestColumns: ColumnsType<PermissionRequestRow> = useMemo(() => [
    {
      title: "Thời gian",
      dataIndex: "RequestDate",
      width: 160,
      render: formatDate,
    },
    {
      title: "Trạng thái",
      dataIndex: "StatusID",
      width: 130,
      render: (status: string, record) => {
        const normalizedStatus = normalizeRequestStatus(status)
        return (
          <Tag color={REQUEST_STATUS_COLORS[normalizedStatus] || "default"}>
            {record.StatusName || REQUEST_STATUS_LABELS[normalizedStatus] || status}
          </Tag>
        )
      },
    },
    {
      title: "Người yêu cầu",
      dataIndex: "RequestByName",
      width: 220,
      render: (name: string, record) => (
        <div>
          <Typography.Text strong>{name || "—"}</Typography.Text>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{record.UnitName}</Typography.Text>
        </div>
      ),
    },
    {
      title: "Nội dung yêu cầu",
      dataIndex: "Title",
      render: (_: string, record) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography.Text>{record.Title}</Typography.Text>
          <Typography.Text type="secondary">{record.Description || "Yêu cầu mở tất cả quyền chức năng"}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>Mã: {getRequestId(record)}</Typography.Text>
        </div>
      ),
    },
    {
      title: "Xét duyệt",
      width: 260,
      render: (_, record) => {
        const requestId = getRequestId(record)
        const status = normalizeRequestStatus(record.StatusID)
        
        // Nếu đang chờ duyệt - hiển thị nút cho người có quyền
        if (status === "Pending") {
          const canReview = canReviewRequests
          if (!canReview) return <Typography.Text type="secondary">Chờ cấp trên duyệt</Typography.Text>
          return (
            <Space>
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={reviewingRequestId === requestId}
                onClick={() => handleApprove(record)}
              >
                Duyệt
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                loading={reviewingRequestId === requestId}
                onClick={() => handleReject(record)}
              >
                Từ chối
              </Button>
            </Space>
          )
        }
        
        // Nếu đã duyệt
        if (status === "Approved") {
          return (
            <div style={{ fontSize: 12 }}>
              <Typography.Text type="success" style={{ color: "#52c41a", fontWeight: 500 }}>
                ✓ Đã duyệt
              </Typography.Text>
              {record.ApprovedByName && (
                <div style={{ color: "#8c8c8c" }}>
                  Bởi: {record.ApprovedByName}
                </div>
              )}
              {record.ApprovedDate && (
                <div style={{ color: "#8c8c8c" }}>
                  {formatDate(record.ApprovedDate)}
                </div>
              )}
            </div>
          )
        }
        
        // Nếu đã từ chối
        if (status === "Rejected") {
          return (
            <div style={{ fontSize: 12 }}>
              <Typography.Text type="danger" style={{ color: "#ff4d4f", fontWeight: 500 }}>
                ✗ Đã từ chối
              </Typography.Text>
              {record.ApprovedByName && (
                <div style={{ color: "#8c8c8c" }}>
                  Bởi: {record.ApprovedByName}
                </div>
              )}
              {record.RejectReason && (
                <div style={{ color: "#8c8c8c", fontStyle: "italic" }}>
                  Lý do: {record.RejectReason}
                </div>
              )}
            </div>
          )
        }
        
        return <Typography.Text type="secondary">—</Typography.Text>
      },
    },
  ], [canReviewRequests, reviewingRequestId])

  // Filter logic for History
  const filteredHistory = useMemo(() => {
    let filtered = history.filter((item) => ["INSERT", "UPDATE", "DELETE"].includes(item.ChangeType))
    
    // Filter by search text
    if (historySearch.trim()) {
      const searchLower = historySearch.toLowerCase()
      filtered = filtered.filter((item) => 
        item.ChangedByName?.toLowerCase().includes(searchLower) ||
        item.Description?.toLowerCase().includes(searchLower) ||
        item.ChangeReason?.toLowerCase().includes(searchLower) ||
        item.ID?.toLowerCase().includes(searchLower)
      )
    }
    
    // Filter by type
    if (historyTypeFilter) {
      filtered = filtered.filter((item) => item.ChangeType === historyTypeFilter)
    }
    
    // Filter by date range
    if (historyDateRange && historyDateRange[0] && historyDateRange[1]) {
      const startDate = historyDateRange[0].startOf('day').valueOf()
      const endDate = historyDateRange[1].endOf('day').valueOf()
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.ChangeDate).getTime()
        return itemDate >= startDate && itemDate <= endDate
      })
    }
    
    return filtered
  }, [history, historySearch, historyTypeFilter, historyDateRange])

  // Filter logic for Permission Requests
  const filteredRequests = useMemo(() => {
    let filtered = [...permissionRequests]
    
    // Filter by search text
    if (requestSearch.trim()) {
      const searchLower = requestSearch.toLowerCase()
      filtered = filtered.filter((item) => 
        item.RequestByName?.toLowerCase().includes(searchLower) ||
        item.Title?.toLowerCase().includes(searchLower) ||
        item.Description?.toLowerCase().includes(searchLower) ||
        item.ID?.toLowerCase().includes(searchLower)
      )
    }
    
    // Filter by status
    if (requestStatusFilter) {
      filtered = filtered.filter((item) => normalizeRequestStatus(item.StatusID) === requestStatusFilter)
    }
    
    return filtered
  }, [permissionRequests, requestSearch, requestStatusFilter])

  // Reset filters when switching tabs
  const handleTabChange = (key: string) => {
    setActiveInnerTab(key)
    // Reset filters when switching
    if (key === "history") {
      setRequestSearch("")
      setRequestStatusFilter(undefined)
    } else {
      setHistorySearch("")
      setHistoryTypeFilter(undefined)
      setHistoryDateRange(null)
    }
  }

  return (
    <Card>
      <Tabs
        activeKey={activeInnerTab}
        onChange={handleTabChange}
        tabBarExtraContent={(
          <Space>
            <Button icon={<ReloadOutlined />} onClick={refreshAll}>Tải lại</Button>
            {activeInnerTab === "permissionRequests" && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setRequestModalOpen(true)}>Yêu cầu mở quyền</Button>
            )}
          </Space>
        )}
        items={[
          {
            key: "history",
            label: `Lịch sử thay đổi (${filteredHistory.length})`,
            children: (
              <div>
                {/* Filter Bar for History */}
                <Card size="small" style={{ marginBottom: 16, background: "#fafafa" }} styles={{ body: { padding: "12px 16px" } }}>
                  <Row gutter={[12, 12]} align="middle">
                    <Col flex="auto">
                      <Input
                        placeholder="Tìm theo tên người thao tác, nội dung, mã..."
                        prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        style={{ maxWidth: 350 }}
                        allowClear
                      />
                    </Col>
                    <Col>
                      <Select
                        placeholder="Loại thay đổi"
                        value={historyTypeFilter}
                        onChange={setHistoryTypeFilter}
                        style={{ width: 160 }}
                        allowClear
                        options={[
                          { value: "INSERT", label: "Thêm mới" },
                          { value: "UPDATE", label: "Cập nhật" },
                          { value: "DELETE", label: "Xoá" },
                        ]}
                      />
                    </Col>
                    <Col>
                      <DatePicker.RangePicker
                        value={historyDateRange}
                        onChange={(dates) => setHistoryDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
                        format="DD/MM/YYYY"
                        placeholder={["Từ ngày", "Đến ngày"]}
                        style={{ width: 260 }}
                      />
                    </Col>
                    <Col>
                      <Button 
                        icon={<FilterOutlined />} 
                        onClick={() => {
                          setHistorySearch("")
                          setHistoryTypeFilter(undefined)
                          setHistoryDateRange(null)
                        }}
                      >
                        Xóa bộ lọc
                      </Button>
                    </Col>
                  </Row>
                </Card>
                
                <Table<ChangeHistoryRow>
                  rowKey={(record) => getHistoryId(record)}
                  columns={historyColumns}
                  dataSource={filteredHistory}
                  loading={historyLoading}
                  pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `Tổng ${total} bản ghi` }}
                  locale={{ emptyText: "Không có dữ liệu" }}
                />
              </div>
            ),
          },
          {
            key: "permissionRequests",
            label: `Yêu cầu mở quyền (${filteredRequests.length})`,
            children: (
              <div>
                {/* Filter Bar for Permission Requests */}
                <Card size="small" style={{ marginBottom: 16, background: "#fafafa" }} styles={{ body: { padding: "12px 16px" } }}>
                  <Row gutter={[12, 12]} align="middle">
                    <Col flex="auto">
                      <Input
                        placeholder="Tìm theo tên người yêu cầu, nội dung, mã..."
                        prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
                        value={requestSearch}
                        onChange={(e) => setRequestSearch(e.target.value)}
                        style={{ maxWidth: 350 }}
                        allowClear
                      />
                    </Col>
                    <Col>
                      <Select
                        placeholder="Trạng thái"
                        value={requestStatusFilter}
                        onChange={setRequestStatusFilter}
                        style={{ width: 160 }}
                        allowClear
                        options={[
                          { value: "Pending", label: "Chờ duyệt" },
                          { value: "Approved", label: "Đã duyệt" },
                          { value: "Rejected", label: "Đã từ chối" },
                        ]}
                      />
                    </Col>
                    <Col>
                      <Button 
                        icon={<FilterOutlined />} 
                        onClick={() => {
                          setRequestSearch("")
                          setRequestStatusFilter(undefined)
                        }}
                      >
                        Xóa bộ lọc
                      </Button>
                    </Col>
                  </Row>
                </Card>
                
                <Table<PermissionRequestRow>
                  rowKey={(record) => getRequestId(record)}
                  columns={requestColumns}
                  dataSource={filteredRequests}
                  loading={requestLoading}
                  pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `Tổng ${total} yêu cầu` }}
                  locale={{ emptyText: "Không có dữ liệu" }}
                />
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={detailModalOpen}
        title="Chi tiết lịch sử thay đổi"
        onCancel={() => setDetailModalOpen(false)}
        footer={<Button onClick={() => setDetailModalOpen(false)}>Đóng</Button>}
        width={1000}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {selectedHistory?.header && (
            <Card size="small">
              <Typography.Text strong>{selectedHistory.header.Description || selectedHistory.header.ChangeReason}</Typography.Text>
              <br />
              <Typography.Text type="secondary">
                Người thao tác: {selectedHistory.header.ChangedByName || "—"} | Đơn vị: {selectedHistory.header.UnitName || "—"} | Thời gian: {formatDate(selectedHistory.header.ChangeDate)}
              </Typography.Text>
            </Card>
          )}
          <Table<ChangeHistoryDetailRow>
            rowKey={(record) => record.DetailID || `${record.SoldierID}-${record.FieldName}`}
            size="small"
            loading={detailLoading}
            pagination={false}
            dataSource={selectedHistory?.details || []}
            scroll={{ x: 1100 }}
            columns={[
              { title: "Mã quân nhân", dataIndex: "SoldierID", width: 130, render: displayValue },
              { title: "Họ và tên", dataIndex: "SoldierName", width: 180, render: displayValue },
              {
                title: "Đơn vị",
                key: "Unit",
                width: 260,
                render: (_, record) => renderUnitHierarchy(record.FullPathName || record.UnitFullPath, record.UnitName),
              },
              { title: "Trường thay đổi", dataIndex: "FieldDisplayName", width: 180, render: (value, record) => value || record.FieldName },
              { title: "Thông tin cũ", dataIndex: "OldValue", width: 180, render: displayValue },
              { title: "Thông tin mới", dataIndex: "NewValue", width: 180, render: displayValue },
            ]}
          />
        </div>
      </Modal>

      <Modal
        open={requestModalOpen}
        title="Gửi yêu cầu mở quyền"
        onCancel={() => setRequestModalOpen(false)}
        onOk={handleCreateRequest}
        confirmLoading={submitting}
        okText="Gửi yêu cầu"
        cancelText="Huỷ"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Typography.Paragraph type="secondary">
            Khi cấp trên phê duyệt, hệ thống sẽ mở tất cả chức năng quyền cho tài khoản của bạn.
          </Typography.Paragraph>
          <Form.Item name="title" label="Tiêu đề">
            <Input placeholder="Ví dụ: Xin mở quyền chức năng" />
          </Form.Item>
          <Form.Item name="content" label="Lý do" rules={[{ required: true, message: "Nhập lý do yêu cầu" }]}>
            <TextArea rows={4} placeholder="Nhập lý do cần mở quyền" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}