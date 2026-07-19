"use client"

import { useEffect, useMemo, useState } from "react"
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons"
import { useAuth } from "@/components/auth-provider"

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
  const [form] = Form.useForm()

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
      const response = await fetch(`/api/permission-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, approvedBy: user.userId, rejectReason }),
      })
      const result = await response.json()
      if (result.success) {
        message.success(result.message || "Đã xử lý yêu cầu")
        await refreshPermissions()
        refreshAll()
      } else {
        message.error(result.message || "Lỗi khi xử lý yêu cầu")
      }
    } catch (error) {
      console.error("Lỗi khi xét duyệt yêu cầu:", error)
      message.error("Lỗi khi xử lý yêu cầu")
    }
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
      render: (status: string, record) => <Tag color={REQUEST_STATUS_COLORS[status] || "default"}>{record.StatusName || REQUEST_STATUS_LABELS[status] || status}</Tag>,
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
        <Space direction="vertical" size={2}>
          <Typography.Text>{record.Title}</Typography.Text>
          <Typography.Text type="secondary">{record.Description || "Yêu cầu mở tất cả quyền chức năng"}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>Mã: {getRequestId(record)}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "Xét duyệt",
      width: 190,
      render: (_, record) => {
        const canReview = canReviewRequests && record.StatusID === "Pending"
        if (!canReview) return <Typography.Text type="secondary">—</Typography.Text>
        return (
          <Space>
            <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => reviewRequest(record, "approve")}>Duyệt</Button>
            <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleReject(record)}>Từ chối</Button>
          </Space>
        )
      },
    },
  ], [canReviewRequests])

  return (
    <Card>
      <Tabs
        activeKey={activeInnerTab}
        onChange={setActiveInnerTab}
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
            label: `Lịch sử thay đổi (${history.length})`,
            children: (
              <Table<ChangeHistoryRow>
                rowKey={(record) => getHistoryId(record)}
                columns={historyColumns}
                dataSource={history}
                loading={historyLoading}
                pagination={{ pageSize: 20, showSizeChanger: true }}
              />
            ),
          },
          {
            key: "permissionRequests",
            label: `Yêu cầu mở quyền (${permissionRequests.filter((item) => item.StatusID === "Pending").length})`,
            children: (
              <Table<PermissionRequestRow>
                rowKey={(record) => getRequestId(record)}
                columns={requestColumns}
                dataSource={permissionRequests}
                loading={requestLoading}
                pagination={{ pageSize: 20, showSizeChanger: true }}
              />
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
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
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
            columns={[
              { title: "Chiến sĩ", dataIndex: "SoldierName", width: 180, render: (value, record) => value || record.SoldierID || "—" },
              { title: "CCCD", dataIndex: "CitizenID", width: 120, render: displayValue },
              { title: "Đơn vị", dataIndex: "UnitName", width: 160, render: displayValue },
              { title: "Trường", dataIndex: "FieldDisplayName", width: 180, render: (value, record) => value || record.FieldName },
              { title: "Giá trị cũ", dataIndex: "OldValue", render: displayValue },
              { title: "Giá trị mới", dataIndex: "NewValue", render: displayValue },
            ]}
          />
        </Space>
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
