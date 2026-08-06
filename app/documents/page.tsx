/**
 * File: app/documents/page.tsx
 * Mô tả: Trang Tài liệu quân lực - theo design mới
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { App, Button, Card, Input, Select, Table, Tag, Typography, Space, DatePicker, Tooltip } from "antd"
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
} from "@ant-design/icons"
import { PageLayout } from "@/components/page-layout"
import { useAuth } from "@/components/auth-provider"
import dayjs from "dayjs"

const { Title, Text } = Typography
const { RangePicker } = DatePicker

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
      // TODO: Implement API call
      // const response = await fetch(`/api/documents?userId=${user.userId}`)
      // const result = await response.json()
      // if (result.success) {
      //   setDocuments(result.data || [])
      // }

      // Mock data for now
      setDocuments([
        {
          DocumentID: "D001",
          Title: "Quyết định cử đi đào tạo cán bộ năm 2025",
          ReferenceNumber: "1234/QĐ-BTTM",
          DocumentType: "chi_thi",
          IssuingUnit: "Bộ Tổng Tham mưu",
          IssueDate: "2025-05-20",
          Status: "active",
          AttachmentCount: 4,
          FileType: "docx",
        },
        {
          DocumentID: "D002",
          Title: "Thông tư 25/2025/TT-BQP",
          ReferenceNumber: "25/2025/TT-BQP",
          DocumentType: "thong_tu",
          IssuingUnit: "Bộ Quốc phòng",
          IssueDate: "2025-05-15",
          Status: "active",
          AttachmentCount: 2,
          FileType: "pdf",
        },
        {
          DocumentID: "D003",
          Title: "Kế hoạch huấn luyện năm 2025",
          ReferenceNumber: "567/KH-ĐTM",
          DocumentType: "ke_hoach",
          IssuingUnit: "Cục Đào tạo",
          IssueDate: "2025-05-10",
          Status: "active",
          AttachmentCount: 3,
          FileType: "xlsx",
        },
        {
          DocumentID: "D004",
          Title: "Báo cáo tổng hợp quý I/2025",
          ReferenceNumber: "89/BC-ĐTM",
          DocumentType: "bao_cao",
          IssuingUnit: "Phòng Tổng hợp",
          IssueDate: "2025-04-30",
          Status: "active",
          AttachmentCount: 5,
          FileType: "xlsx",
        },
        {
          DocumentID: "D005",
          Title: "Hướng dẫn thực hiện công tác chính trị",
          ReferenceNumber: "12/HD-CT",
          DocumentType: "huong_dan",
          IssuingUnit: "Cục Chính trị",
          IssueDate: "2025-04-25",
          Status: "active",
          AttachmentCount: 2,
          FileType: "docx",
        },
        {
          DocumentID: "D006",
          Title: "Quy chế thi đua khen thưởng",
          ReferenceNumber: "34/QC-KT",
          DocumentType: "quy_che",
          IssuingUnit: "Bộ Quốc phòng",
          IssueDate: "2025-04-20",
          Status: "expired",
          AttachmentCount: 1,
          FileType: "pdf",
        },
      ])
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
      width: 80,
      align: "center",
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Tải xuống">
            <Button type="text" size="small" icon={<DownloadOutlined />} onClick={(e) => e.stopPropagation()} />
          </Tooltip>
          <Tooltip title="Khác">
            <Button type="text" size="small" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
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
          <Button
            type="primary"
            icon={<PlusOutlined />}
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
    </PageLayout>
  )
}
