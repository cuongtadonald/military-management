"use client"

import { useState } from "react"
import { Button, Space, Table, Tag, Tooltip } from "antd"
import type { ColumnsType } from "antd/es/table"
import { EyeOutlined } from "@ant-design/icons"
import type { ChangeLog } from "@/lib/change-log"
import { useChangeLog } from "@/lib/change-log"
import { ChangeReviewModal } from "@/components/change-review-modal"
import type { Soldier } from "@/lib/soldiers"

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

interface ChangeLogTabProps {
  data: Soldier[]
  setData: React.Dispatch<React.SetStateAction<Soldier[]>>
}

export function ChangeLogTab({ data, setData }: ChangeLogTabProps) {
  const { logs } = useChangeLog()
  const [selectedLog, setSelectedLog] = useState<ChangeLog | null>(null)

  const handleApprove = (logId: string, changes: any[]) => {
    const log = logs.find((l) => l.id === logId)
    if (!log) return

    setData((prev) =>
      prev.map((soldier) => {
        if (soldier.id !== log.soldierId) return soldier
        const updated = { ...soldier }
        changes.forEach((change) => {
          const field = change.field as keyof Soldier
          let newValue = change.newValue
          ;(updated as any)[field] = newValue
        })
        return updated
      })
    )
  }

  const columns: ColumnsType<ChangeLog> = [
    {
      title: "Mã đề xuất",
      dataIndex: "id",
      key: "id",
      width: 120,
    },
    {
      title: "Chiến sĩ",
      dataIndex: "soldierName",
      key: "soldierName",
      render: (name: string, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>{record.soldierId}</div>
        </div>
      ),
    },
    {
      title: "Người đề xuất",
      dataIndex: "requestedBy",
      key: "requestedBy",
      render: (name: string, record) => (
        <div>
          <div>{name}</div>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>{record.requestedRole}</div>
        </div>
      ),
    },
    {
      title: "Số thay đổi",
      dataIndex: "changes",
      key: "changes",
      width: 100,
      align: "center",
      render: (changes: any[]) => <Tag>{changes.length} trường</Tag>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: string) => <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>,
    },
    {
      title: "Ngày gửi",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Tooltip title="Xem chi tiết">
          <Button type="text" icon={<EyeOutlined />} onClick={() => setSelectedLog(record)} />
        </Tooltip>
      ),
    },
  ]

  return (
    <>
      <Table<ChangeLog>
        rowKey="id"
        columns={columns}
        dataSource={logs}
        pagination={{ pageSize: 10, showTotal: (total) => `Tổng ${total} đề xuất` }}
        size="small"
      />

      <ChangeReviewModal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
        onApprove={handleApprove}
      />
    </>
  )
}