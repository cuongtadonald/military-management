"use client"

import { useState } from "react"
import { App, Button, Input, Modal, Space, Table, Tag, Typography } from "antd"
import type { ColumnsType } from "antd/es/table"
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons"
import type { ChangeLog, ChangeEntry } from "@/lib/change-log"
import { useChangeLog } from "@/lib/change-log"
import { useAuth } from "@/components/auth-provider"

const { TextArea } = Input

interface ChangeReviewModalProps {
  open: boolean
  onClose: () => void
  log: ChangeLog | null
  onApprove?: (logId: string, changes: ChangeEntry[]) => void
}

export function ChangeReviewModal({ open, onClose, log, onApprove }: ChangeReviewModalProps) {
  const { message } = App.useApp()
  const { reviewLog } = useChangeLog()
  const { user, hasPermission } = useAuth()
  const [note, setNote] = useState("")

  if (!log) return null

  const canApprove = hasPermission("canApproveRequest") && log.status === "pending"
  const isReadOnly = log.status !== "pending" || !canApprove

  const statusColors: Record<string, string> = {
    completed: "green",
    pending: "orange",
    rejected: "red",
  }

  const statusLabels: Record<string, string> = {
    completed: "Đã thực hiện",
    pending: "Chờ phê duyệt",
    rejected: "Đã từ chối",
  }

  const columns: ColumnsType<ChangeEntry> = [
    {
      title: "Trường",
      dataIndex: "label",
      key: "label",
      width: 150,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Giá trị hiện tại",
      dataIndex: "oldValue",
      key: "oldValue",
      render: (text: string) => <span style={{ color: "#8c8c8c" }}>{text}</span>,
    },
    {
      title: "Đề xuất mới",
      dataIndex: "newValue",
      key: "newValue",
      render: (text: string) => <span style={{ color: "#4b5320", fontWeight: 600 }}>{text}</span>,
    },
  ]

  const handleApprove = () => {
    if (!log) return
    reviewLog(log.id, "completed", user?.fullName || "Không xác định", note)
    if (onApprove) {
      onApprove(log.id, log.changes)
    }
    message.success("Đã phê duyệt đề xuất thay đổi!")
    setNote("")
    onClose()
  }

  const handleReject = () => {
    if (!log) return
    reviewLog(log.id, "rejected", user?.fullName || "Không xác định", note)
    message.info("Đã từ chối đề xuất thay đổi.")
    setNote("")
    onClose()
  }

  return (
    <Modal
      open={open}
      title={
        <Space>
          <span>Chi tiết đề xuất: {log.soldierName}</span>
          <Tag color={statusColors[log.status]}>{statusLabels[log.status]}</Tag>
        </Space>
      }
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <div style={{ marginBottom: 16 }}>
        <Typography.Text type="secondary">
          Người đề xuất: <strong>{log.requestedBy}</strong> ({log.requestedRole})
        </Typography.Text>
        <br />
        <Typography.Text type="secondary">
          Ngày gửi: <strong>{log.createdAt}</strong>
        </Typography.Text>
        {log.reviewedBy && (
          <>
            <br />
            <Typography.Text type="secondary">
              Người duyệt: <strong>{log.reviewedBy}</strong> — {log.reviewedAt}
            </Typography.Text>
          </>
        )}
      </div>

      <Table<ChangeEntry>
        rowKey="field"
        columns={columns}
        dataSource={log.changes}
        pagination={false}
        size="small"
        bordered
      />

      {log.reviewNote && (
        <div style={{ marginTop: 16, padding: 12, background: "#f6f6f6", borderRadius: 6 }}>
          <Typography.Text type="secondary">Ghi chú: </Typography.Text>
          <Typography.Text>{log.reviewNote}</Typography.Text>
        </div>
      )}

      {!isReadOnly && (
        <div style={{ marginTop: 16 }}>
          <Typography.Text strong>Ghi chú phê duyệt:</Typography.Text>
          <TextArea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nhập ghi chú (không bắt buộc)..."
            style={{ marginTop: 8 }}
          />
        </div>
      )}

      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button onClick={onClose}>Đóng</Button>
        {!isReadOnly && (
          <>
            <Button danger icon={<CloseCircleOutlined />} onClick={handleReject}>
              Từ chối
            </Button>
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleApprove} style={{ background: "#4b5320", borderColor: "#4b5320" }}>
              Phê duyệt
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}