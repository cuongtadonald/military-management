/**
 * File: components/document-detail-modal.tsx
 * Mô tả: Modal xem chi tiết tài liệu quân lực
 * Cập nhật: 2026-07-21
 * 
 * Hiển thị thông tin tài liệu và danh sách file đính kèm
 */

"use client"

import { useAuth } from "@/components/auth-provider"
import { useEffect, useState } from "react"
import { App, Button, Descriptions, Empty, Modal, Space, Spin, Table, Typography } from "antd"
import type { ColumnsType } from "antd/es/table"
import { DownloadOutlined, FileOutlined } from "@ant-design/icons"

// ============================================================
// INTERFACES
// ============================================================

interface DocumentDetailModalProps {
  open: boolean
  documentId: string | null
  onClose: () => void
}

interface DocumentInfo {
  DocumentID: string
  DocumentName: string
  CreatedDate: string
  UnitID: string
  StatusName: string
  Content: string
}

interface AttachmentFile {
  FileID: string
  FileName: string
  FileSize: number
  UploadedDate: string
  FilePath: string
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function DocumentDetailModal({ open, documentId, onClose }: DocumentDetailModalProps) {

  const { user } = useAuth()
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null)
  const [attachments, setAttachments] = useState<AttachmentFile[]>([])

  // Load chi tiết tài liệu khi mở modal
  useEffect(() => {
    if (open && documentId) {
      loadDocumentDetail()
    } else {
      setDocumentInfo(null)
      setAttachments([])
    }
  }, [open, documentId])

  const loadDocumentDetail = async () => {
  if (!documentId || !user?.userId) return

  try {
    setLoading(true)

    const response = await fetch(
      `/api/documents?userId=${user.userId}&documentId=${documentId}`
    )

    const result = await response.json()

    if (result.success) {
      setDocumentInfo(result.data.document)
      setAttachments(result.data.attachments || [])
    } else {
      message.error(result.message || "Không tải được chi tiết tài liệu")
    }

  } catch (error) {
    console.error("Lỗi khi tải chi tiết tài liệu:", error)
    message.error("Lỗi kết nối server")
  } finally {
    setLoading(false)
  }
}

  // Format kích thước file
  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "—"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Format ngày tháng
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—"
    try {
      const date = new Date(dateStr)
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
    } catch {
      return dateStr
    }
  }

  // Cột cho bảng file đính kèm
  const attachmentColumns: ColumnsType<AttachmentFile> = [
    {
      title: "Tên file",
      dataIndex: "FileName",
      key: "FileName",
      render: (text: string) => (
        <Space>
          <FileOutlined style={{ color: "#4b5320" }} />
          <span>{text}</span>
        </Space>
      ),
    },
    // {
    //   title: "Kích thước",
    //   dataIndex: "FileSize",
    //   key: "FileSize",
    //   width: 120,
    //   render: (size: number) => formatFileSize(size),
    // },
    {
      title: "Ngày tải lên",
      dataIndex: "UploadedDate",
      key: "UploadedDate",
      width: 140,
      render: (date: string) => formatDate(date),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 100,
      render: (_: any, record: AttachmentFile) => (
        <Button
          type="link"
          icon={<DownloadOutlined />}
          href={record.FilePath}
          target="_blank"
          size="small"
        >
          Tải xuống
        </Button>
      ),
    },
  ]

  return (
    <Modal
      open={open}
      title={
        <Space>
          <FileOutlined style={{ color: "#4b5320" }} />
          <span style={{ color: "#4b5320" }}>Chi tiết tài liệu quân lực</span>
        </Space>
      }
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      width={800}
      destroyOnHidden
    >
      <Spin spinning={loading}>
        {documentInfo ? (
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            {/* Thông tin tài liệu */}
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Tên tài liệu" span={2}>
                <Typography.Text strong style={{ fontSize: 15 }}>
                  {documentInfo.DocumentName}
                </Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {formatDate(documentInfo.CreatedDate)}
              </Descriptions.Item>
              {/* <Descriptions.Item label="Đơn vị">
                {documentInfo.UnitID || "—"}
              </Descriptions.Item> */}
              <Descriptions.Item label="Trạng thái" span={2}>
                {documentInfo.StatusName || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Nội dung" span={2}>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {documentInfo.Content || "—"}
                </div>
              </Descriptions.Item>
            </Descriptions>

            {/* File đính kèm */}
            <Typography.Title level={5} style={{ color: "#4b5320", marginBottom: 12 }}>
              File đính kèm
            </Typography.Title>
            {attachments.length > 0 ? (
              <Table<AttachmentFile>
                rowKey="FileID"
                columns={attachmentColumns}
                dataSource={attachments}
                pagination={false}
                size="small"
                bordered
              />
            ) : (
              <Empty
                description="Không có file đính kèm."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ margin: "20px 0" }}
              />
            )}
          </div>
        ) : (
          !loading && (
            <Empty description="Không có dữ liệu." />
          )
        )}
      </Spin>
    </Modal>
  )
}
