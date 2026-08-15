/**
 * File: app/documents/page.tsx
 * Mô tả: Trang Tài liệu quân lực - theo design mới
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { App, Button, Card, Input, Select, Table, Tag, Typography, Space, DatePicker, Tooltip, Modal, Form, Upload, message as antMessage } from "antd"
import type { ColumnsType } from "antd/es/table"
import {
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  EyeOutlined,
  DownloadOutlined,
  MoreOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  PaperClipOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  InboxOutlined,
} from "@ant-design/icons"
import { PageLayout } from "@/components/page-layout"
import { useAuth } from "@/components/auth-provider"
import dayjs from "dayjs"

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { TextArea } = Input
const { Dragger } = Upload

// ============================================================
// CONSTANTS
// ============================================================

const DOCUMENT_TYPE_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "chi_thi", label: "Chỉ thị" },
  { value: "thong_tu", label: "Thông tư" },
  { value: "ke_hoach", label: "Kế hoạch" },
  { value: "bao_cao", label: "Báo cáo" },
  { value: "huong_dan", label: "Hướng dẫn" },
  { value: "quy_che", label: "Quy chế" },
  { value: "mau_bieu", label: "Mẫu biểu" },
  { value: "cong_van", label: "Công văn" },
]

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "active", label: "Hiệu lực" },
  { value: "expired", label: "Hết hiệu lực" },
]

const DOCUMENT_TYPE_COLORS: Record<string, string> = {
  chi_thi: "blue",
  thong_tu: "orange",
  ke_hoach: "cyan",
  bao_cao: "green",
  huong_dan: "geekblue",
  quy_che: "purple",
  mau_bieu: "gold",
  cong_van: "volcano",
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  chi_thi: "Chỉ thị",
  thong_tu: "Thông tư",
  ke_hoach: "Kế hoạch",
  bao_cao: "Báo cáo",
  huong_dan: "Hướng dẫn",
  quy_che: "Quy chế",
  mau_bieu: "Mẫu biểu",
  cong_van: "Công văn",
}

// ============================================================
// INTERFACES
// ============================================================

interface Document {
  DocumentID: string
  Title: string
  ReferenceNumber: string
  DocumentType: string
  IssuingUnit: string
  IssueDate: string
  Status: string
  AttachmentCount: number
  FileType: string
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

function getFileIcon(fileType: string) {
  switch (fileType?.toLowerCase()) {
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
  const router = useRouter()
  const { message } = App.useApp()
  const { user, isLoading } = useAuth()

  // Filter state
  const [searchText, setSearchText] = useState("")
  const [documentType, setDocumentType] = useState("")
  const [status, setStatus] = useState("")
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)

  // Data state
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false)
  const [editingDocument, setEditingDocument] = useState<Document | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

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
        // Map dữ liệu từ API sang format của frontend
        const mappedData = (result.data || []).map((doc: any) => ({
          DocumentID: doc.DocumentID,
          Title: doc.DocumentName,
          ReferenceNumber: doc.DocumentID, // Sử dụng DocumentID làm ReferenceNumber
          DocumentType: 'tai_lieu', // Default type
          IssuingUnit: doc.UnitID || '',
          IssueDate: doc.CreatedDate,
          Status: doc.StatusName?.toLowerCase().includes('hết') ? 'expired' : 'active',
          AttachmentCount: 0, // TODO: Đếm số file đính kèm
          FileType: 'docx', // Default type
        }))
        setDocuments(mappedData)
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
    setDocumentType("")
    setStatus("")
    setDateRange(null)
  }

  // Mở modal thêm mới
  const handleAdd = () => {
    if (user?.permissionLevel !== 1) {
      message.error('Bạn không có quyền thêm tài liệu')
      return
    }
    setEditingDocument(null)
    form.resetFields()
    setModalVisible(true)
  }

  // Mở modal sửa
  const handleEdit = (record: Document) => {
    if (user?.permissionLevel !== 1) {
      message.error('Bạn không có quyền sửa tài liệu')
      return
    }
    setEditingDocument(record)
    form.setFieldsValue({
      DocumentName: record.Title,
      Content: '', // TODO: Load content từ API
    })
    setModalVisible(true)
  }

  // Xóa tài liệu
  const handleDelete = (record: Document) => {
    if (user?.permissionLevel !== 1) {
      message.error('Bạn không có quyền xóa tài liệu')
      return
    }
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: `Bạn có chắc chắn muốn xóa tài liệu "${record.Title}"?`,
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

  // Submit form thêm/sửa
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      const payload = {
        DocumentName: values.DocumentName,
        Content: values.Content || '',
        UnitID: user?.unitId || '',
        StatusID: 'ST001',
        CreatedBy: user?.userId,
        ModifiedBy: user?.userId,
      }

      let response
      if (editingDocument) {
        // Sửa
        response = await fetch('/api/documents', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            DocumentID: editingDocument.DocumentID,
          }),
        })
      } else {
        // Thêm mới
        response = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      const result = await response.json()
      if (result.success) {
        message.success(editingDocument ? 'Đã cập nhật tài liệu' : 'Đã thêm tài liệu mới')
        setModalVisible(false)
        form.resetFields()
        loadDocuments()
      } else {
        message.error(result.message || 'Lỗi khi lưu tài liệu')
      }
    } catch (error: any) {
      if (error.errorFields) {
        message.error('Vui lòng điền đầy đủ thông tin')
      } else {
        console.error('Lỗi:', error)
        message.error('Lỗi khi lưu tài liệu')
      }
    } finally {
      setSubmitting(false)
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
      width: 320,
      render: (_, record) => (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            {getFileIcon(record.FileType)}
            <Text strong style={{ fontSize: 13 }}>
              {record.Title}
            </Text>
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Số ký hiệu: {record.ReferenceNumber}
          </Text>
        </div>
      ),
    },
    {
      title: "Loại tài liệu",
      dataIndex: "DocumentType",
      width: 120,
      render: (type: string) => (
        <Tag color={DOCUMENT_TYPE_COLORS[type] || "default"} style={{ fontSize: 12 }}>
          {DOCUMENT_TYPE_LABELS[type] || type}
        </Tag>
      ),
    },
    {
      title: "Đơn vị ban hành",
      dataIndex: "IssuingUnit",
      width: 180,
      render: (unit: string) => <Text style={{ fontSize: 13 }}>{unit || "—"}</Text>,
    },
    {
      title: "Ngày ban hành",
      dataIndex: "IssueDate",
      width: 120,
      sorter: (a, b) => new Date(a.IssueDate).getTime() - new Date(b.IssueDate).getTime(),
      defaultSortOrder: "descend",
      render: (date: string) => <Text style={{ fontSize: 13 }}>{formatDate(date)}</Text>,
    },
    {
      title: "Trạng thái",
      dataIndex: "Status",
      width: 120,
      align: "center",
      render: (status: string) => (
        <Tag color={status === "active" ? "success" : "default"} style={{ fontSize: 12 }}>
          {status === "active" ? "Hiệu lực" : "Hết hiệu lực"}
        </Tag>
      ),
    },
    {
      title: "Tệp đính kèm",
      dataIndex: "AttachmentCount",
      width: 100,
      align: "center",
      render: (count: number) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <PaperClipOutlined style={{ color: "#8c8c8c" }} />
          <Text style={{ fontSize: 13 }}>{count}</Text>
        </div>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Space size={4}>
          {user?.permissionLevel === 1 && (
            <>
              <Tooltip title="Sửa">
                <Button type="text" size="small" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={(e) => { e.stopPropagation(); handleEdit(record) }} />
              </Tooltip>
              <Tooltip title="Xóa">
                <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); handleDelete(record) }} />
              </Tooltip>
            </>
          )}
          <Tooltip title="Tải xuống">
            <Button type="text" size="small" icon={<DownloadOutlined />} onClick={(e) => e.stopPropagation()} />
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
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, color: "#212121" }}>
          Tài liệu quân lực
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
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
            placeholder="Loại tài liệu"
            value={documentType}
            onChange={setDocumentType}
            options={DOCUMENT_TYPE_OPTIONS}
            style={{ width: 150 }}
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
          />
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            Đặt lại
          </Button>
          {user?.permissionLevel === 1 && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              style={{ background: "#3a4d2e", borderColor: "#3a4d2e" }}
            >
              Thêm tài liệu
            </Button>
          )}
        </Space>
      </Card>

      {/* Table */}
      <Card style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="DocumentID"
          columns={columns}
          dataSource={documents}
          loading={loading}
          onRow={(record) => ({
            onClick: () => message.info("Trang chi tiết tài liệu đang được phát triển"),
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

      {/* Modal Thêm/Sửa tài liệu */}
      <Modal
        title={editingDocument ? "Sửa tài liệu" : "Thêm tài liệu mới"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingDocument(null)
          form.resetFields()
        }}
        width={600}
        footer={[
          <Button key="cancel" onClick={() => {
            setModalVisible(false)
            setEditingDocument(null)
            form.resetFields()
          }}>
            Hủy
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit} loading={submitting}>
            {editingDocument ? "Cập nhật" : "Thêm mới"}
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="DocumentName"
            label="Tên tài liệu"
            rules={[{ required: true, message: "Vui lòng nhập tên tài liệu" }]}
          >
            <Input placeholder="Nhập tên tài liệu" />
          </Form.Item>
          <Form.Item
            name="Content"
            label="Nội dung"
          >
            <TextArea rows={4} placeholder="Nhập nội dung tài liệu" />
          </Form.Item>
          <Form.Item label="File đính kèm">
            <Dragger
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              beforeUpload={() => false}
              multiple
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Kéo thả file hoặc click để chọn</p>
              <p className="ant-upload-hint">Hỗ trợ: PDF, Word, Excel</p>
            </Dragger>
          </Form.Item>
        </Form>
      </Modal>
    </PageLayout>
  )
}
