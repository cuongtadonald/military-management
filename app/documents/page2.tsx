/**
 * File: app/documents/page.tsx
 * Mô tả: Trang Tài liệu quân lực - thiết kế lại theo design mới
 * Cập nhật: 2026-08-16
 */

"use client"

import { useState, useEffect } from "react"
import { App, Button, Card, Input, Select, Table, Tag, Typography, Space, DatePicker, Tooltip, Modal, Form, Upload, message as antMessage } from "antd"
import type { ColumnsType } from "antd/es/table"
import {
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  PaperClipOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  InboxOutlined,
  EyeOutlined,
} from "@ant-design/icons"
import { PageLayout } from "@/components/page-layout"
import { useAuth } from "@/components/auth-provider"
import { DocumentDetailModal } from "@/components/document-detail-modal"
import { DocumentForm } from "@/components/document-form"
import dayjs from "dayjs"

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { TextArea } = Input

// ============================================================
// CONSTANTS
// ============================================================

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "ST101", label: "Hiệu lực" },
  { value: "ST102", label: "Hết hiệu lực" },
]

// ============================================================
// INTERFACES
// ============================================================

interface Document {
  DocumentID: string
  DocumentName: string
  Content: string
  CreatedDate: string
  UnitID: string
  StatusID: string
  StatusName: string
  AttachmentCount?: number
}

// ============================================================
// HELPERS
// ============================================================

function formatDate(value?: string) {
  if (!value) return "—"
  try {
    return dayjs(value).format("DD/MM/YYYY")
  } catch {
    return value
  }
}

function getFileIcon(fileName?: string) {
  const ext = fileName?.split('.').pop()?.toLowerCase()
  switch (ext) {
    case "pdf":
      return <FilePdfOutlined style={{ color: "#ff4d4f" }} />
    case "xlsx":
    case "xls":
      return <FileExcelOutlined style={{ color: "#52c41a" }} />
    case "doc":
    case "docx":
      return <FileWordOutlined style={{ color: "#1890ff" }} />
    default:
      return <FileTextOutlined style={{ color: "#8c8c8c" }} />
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function DocumentsPage() {
  const { message } = App.useApp()
  const { user, isLoading } = useAuth()

  // Filter state
  const [searchText, setSearchText] = useState("")
  const [status, setStatus] = useState("")
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)

  // Data state
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  
  // Modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingDocument, setEditingDocument] = useState<Document | null>(null)

  // Load data
  useEffect(() => {
    if (!isLoading && user?.userId) {
      loadDocuments()
    }
  }, [user, isLoading])

  const loadDocuments = async () => {
    if (!user?.userId) return
    try {
      setLoading(true)
      const response = await fetch(`/api/documents?userId=${user.userId}`)
      const result = await response.json()
      
      if (result.success) {
        setDocuments(result.data || [])
      } else {
        message.error(result.message || 'Lỗi khi tải tài liệu')
      }
    } catch (error) {
      console.error("Lỗi khi tải tài liệu:", error)
      message.error("Lỗi kết nối server")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSearchText("")
    setStatus("")
    setDateRange(null)
  }

  // Xem chi tiết
  const handleView = (documentId: string) => {
    setSelectedDocumentId(documentId)
    setDetailModalOpen(true)
  }

  // Mở modal sửa
  const handleEdit = async (record: Document) => {
    try {
      const response = await fetch(`/api/documents?userId=${user?.userId}&documentId=${record.DocumentID}`)
      const result = await response.json()

      if (result.success) {
        setEditingDocument({
          ...result.data.document,
          attachments: result.data.attachments || [],
        })
        setFormModalOpen(true)
      } else {
        message.error(result.message || "Không tải được chi tiết tài liệu")
      }
    } catch (error) {
      console.error("Lỗi khi tải chi tiết:", error)
      message.error("Lỗi kết nối server")
    }
  }

  // Mở modal thêm mới
  const handleAdd = () => {
    setEditingDocument(null)
    setFormModalOpen(true)
  }

  // Xóa tài liệu
  const handleDelete = (record: Document) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: `Bạn có chắc chắn muốn xóa tài liệu "${record.DocumentName}"?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const response = await fetch(`/api/documents?documentId=${record.DocumentID}`, {
            method: 'DELETE',
          })
          const result = await response.json()
          if (result.success) {
            message.success('Đã xóa tài liệu')
            loadDocuments()
          } else {
            message.error(result.message || 'Lỗi khi xóa tài liệu')
          }
        } catch (error) {
          console.error('Lỗi khi xóa:', error)
          message.error('Lỗi kết nối server')
        }
      },
    })
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

  // ============================================================
  // FILTER DATA
  // ============================================================

  const filteredDocuments = documents.filter((doc) => {
    // Search filter
    if (searchText && !doc.DocumentName.toLowerCase().includes(searchText.toLowerCase())) {
      return false
    }
    // Status filter
    if (status) {
      const isExpired = doc.StatusName?.toLowerCase().includes('hết') || doc.StatusID === 'ST102'
      if (status === 'ST101' && isExpired) return false
      if (status === 'ST102' && !isExpired) return false
    }
    // Date range filter
    if (dateRange && dateRange[0] && dateRange[1]) {
      const docDate = dayjs(doc.CreatedDate)
      if (docDate.isBefore(dateRange[0], 'day') || docDate.isAfter(dateRange[1], 'day')) {
        return false
      }
    }
    return true
  })

  // ============================================================
  // TABLE COLUMNS
  // ============================================================

  const columns: ColumnsType<Document> = [
    {
      title: "STT",
      key: "index",
      width: 60,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Tiêu đề tài liệu",
      key: "title",
      width: 400,
      render: (_, record) => (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <FileTextOutlined style={{ color: "#1890ff", fontSize: 16 }} />
            <Text strong style={{ fontSize: 14 }}>
              {record.DocumentName}
            </Text>
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Mã tài liệu: {record.DocumentID}
          </Text>
        </div>
      ),
    },
    {
      title: "Ngày ban hành",
      dataIndex: "CreatedDate",
      width: 130,
      sorter: (a, b) => new Date(a.CreatedDate).getTime() - new Date(b.CreatedDate).getTime(),
      defaultSortOrder: "descend",
      render: (date: string) => <Text style={{ fontSize: 13 }}>{formatDate(date)}</Text>,
    },
    {
      title: "Trạng thái",
      dataIndex: "StatusName",
      width: 140,
      align: "center",
      render: (statusName: string, record) => {
        const isExpired = statusName?.toLowerCase().includes('hết') || record.StatusID === 'ST102'
        return (
          <Tag color={isExpired ? "default" : "success"} style={{ fontSize: 12 }}>
            {isExpired ? "Hết hiệu lực" : "Hiệu lực"}
          </Tag>
        )
      },
    },
    {
      title: "Tệp đính kèm",
      key: "attachments",
      width: 120,
      align: "center",
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <PaperClipOutlined style={{ color: "#8c8c8c" }} />
          <Text style={{ fontSize: 13 }}>{record.AttachmentCount || 0}</Text>
        </div>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 140,
      align: "center",
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Chỉnh sửa">
            <Button 
              type="text" 
              size="small" 
              icon={<EditOutlined style={{ color: '#52c41a' }} />} 
              onClick={(e) => { e.stopPropagation(); handleEdit(record) }} 
            />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button 
              type="text" 
              size="small" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={(e) => { e.stopPropagation(); handleDelete(record) }} 
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <PageLayout>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, color: "#212121" }}>
          Tài liệu quân lực
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          Quản lý, lưu trữ và chia sẻ tài liệu, văn bản trong toàn hệ thống.
        </Text>
      </div>

      {/* Filter Bar */}
      <Card style={{ marginBottom: 16, borderRadius: 8 }} styles={{ body: { padding: "14px 16px" } }}>
        <Space wrap size={12}>
          <Input
            placeholder="Tìm kiếm tiêu đề tài liệu..."
            prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 280, borderRadius: 8 }}
            allowClear
          />
          <Select
            placeholder="Trạng thái"
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS}
            style={{ width: 150 }}
          />
          <RangePicker
            format="DD/MM/YYYY"
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
            style={{ borderRadius: 8 }}
            placeholder={["Từ ngày", "Đến ngày"]}
          />
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            Đặt lại
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            style={{ background: "#3a4d2e", borderColor: "#3a4d2e" }}
          >
            Thêm tài liệu
          </Button>
        </Space>
      </Card>

      {/* Table */}
      <Card style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="DocumentID"
          columns={columns}
          dataSource={filteredDocuments}
          loading={loading}
          onRow={(record) => ({
            onClick: () => handleView(record.DocumentID),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `Hiển thị ${range[0]} - ${range[1]} của ${total} tài liệu`,
          }}
          scroll={{ x: 1200 }}
          size="middle"
        />
      </Card>

      {/* Modal xem chi tiết */}
      <DocumentDetailModal
        open={detailModalOpen}
        documentId={selectedDocumentId}
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedDocumentId(null)
        }}
      />

      {/* Modal thêm/sửa */}
      <DocumentForm
        open={formModalOpen}
        document={editingDocument}
        onClose={() => {
          setFormModalOpen(false)
          setEditingDocument(null)
        }}
        onSuccess={loadDocuments}
      />
    </PageLayout>
  )
}
