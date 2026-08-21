/**
 * File: components/document-detail-modal.tsx
 * Mô tả: Modal xem chi tiết tài liệu quân lực - thiết kế lại
 * Cập nhật: 2026-08-16
 */

"use client"

import { useAuth } from "@/components/auth-provider"
import { useEffect, useState } from "react"
import { App, Button, Empty, Modal, Space, Spin, Table, Typography, Tag, Upload, Divider } from "antd"
const { Text } = Typography
import type { ColumnsType } from "antd/es/table"
import {
  DownloadOutlined,
  FileOutlined,
  FileWordOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  UploadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PaperClipOutlined,
} from "@ant-design/icons"

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
  StatusID: string
  StatusName: string
  Content: string
}

interface AttachmentFile {
  FileID: string
  FileName: string
  FileSize?: number
  UploadedDate: string
  FilePath: string
}

// ============================================================
// HELPERS
// ============================================================

function getFileIcon(fileName?: string) {
  const ext = fileName?.split('.').pop()?.toLowerCase()
  switch (ext) {
    case "pdf":
      return <FilePdfOutlined style={{ color: "#ff4d4f", fontSize: 24 }} />
    case "xlsx":
    case "xls":
      return <FileExcelOutlined style={{ color: "#52c41a", fontSize: 24 }} />
    case "doc":
    case "docx":
      return <FileWordOutlined style={{ color: "#1890ff", fontSize: 24 }} />
    default:
      return <FileOutlined style={{ color: "#8c8c8c", fontSize: 24 }} />
  }
}

function formatFileSize(bytes?: number) {
  if (!bytes || bytes === 0) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—"
  try {
    const date = new Date(dateStr)
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
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
    if (open && documentId && user?.userId) {
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

  const isExpired = documentInfo?.StatusName?.toLowerCase().includes('hết') || documentInfo?.StatusID === 'ST102'

  // Cột cho bảng file đính kèm
  const attachmentColumns: ColumnsType<AttachmentFile> = [
    {
      title: "Tên file",
      dataIndex: "FileName",
      key: "FileName",
      render: (text: string) => (
        <Space>
          {getFileIcon(text)}
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "Ngày tải lên",
      dataIndex: "UploadedDate",
      key: "UploadedDate",
      width: 160,
      render: (date: string) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 13 }}>{formatDate(date)}</Text>
        </Space>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      align: "center",
      render: (_: any, record: AttachmentFile) => (
        <Button
          type="link"
          icon={<DownloadOutlined />}
          href={`/api/documents/download?fileId=${record.FileID}`}
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
      onCancel={onClose}
      footer={null}
      width={900}
      centered
      styles={{
        body: { padding: 0 },
      }}
    >
      <Spin spinning={loading}>
        {documentInfo ? (
          <div style={{ maxHeight: "80vh", overflowY: "auto" }}>
            {/* Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #f0f0f0",
                background: "#fafafa",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <Typography.Title level={4} style={{ margin: 0, color: "#111827" }}>
                    {documentInfo.DocumentName}
                  </Typography.Title>
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <Space size={4}>
                      <ClockCircleOutlined style={{ color: "#9ca3af", fontSize: 13 }} />
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        Ngày tạo: {formatDate(documentInfo.CreatedDate)}
                      </Text>
                    </Space>
                    <Tag
                      color={isExpired ? "default" : "success"}
                      icon={isExpired ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
                      style={{ fontSize: 12 }}
                    >
                      {isExpired ? "Hết hiệu lực" : "Hiệu lực"}
                    </Tag>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: "24px" }}>
              {/* Tài liệu section */}
              <div style={{ marginBottom: 24 }}>
                <Typography.Title level={5} style={{ color: "#374151", marginBottom: 12 }}>
                  Nội dung tài liệu
                </Typography.Title>
                <div
                  style={{
                    padding: "16px 20px",
                    background: "#f9fafb",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.7,
                    fontSize: 14,
                    color: "#374151",
                  }}
                >
                  {documentInfo.Content || "Không có nội dung"}
                </div>
              </div>

              <Divider style={{ margin: "24px 0" }} />

              {/* File đính kèm section */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <Typography.Title level={5} style={{ color: "#374151", margin: 0 }}>
                    <PaperClipOutlined style={{ marginRight: 8 }} />
                    Tệp đính kèm ({attachments.length})
                  </Typography.Title>
                </div>

                {attachments.length > 0 ? (
                  <Table<AttachmentFile>
                    rowKey="FileID"
                    columns={attachmentColumns}
                    dataSource={attachments}
                    pagination={false}
                    size="middle"
                    style={{ borderRadius: 8, overflow: "hidden" }}
                  />
                ) : (
                  <Empty
                    description="Không có file đính kèm"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    style={{ margin: "20px 0" }}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          !loading && (
            <div style={{ padding: 60 }}>
              <Empty description="Không tìm thấy tài liệu" />
            </div>
          )
        )}
      </Spin>
    </Modal>
  )
}
