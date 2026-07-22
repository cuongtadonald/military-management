/**
 * File: components/document-list-page.tsx
 * Mô tả: Trang danh sách tài liệu quân lực (hiển thị dạng Modal full)
 * Cập nhật: 2026-07-21
 * 
 * Chức năng:
 * - Hiển thị danh sách tài liệu từ SP W02P0001
 * - Thêm mới, Xem chi tiết, Sửa, Xóa tài liệu
 */

"use client"

import { useEffect, useState } from "react"
import { App, Button, Empty, Modal, Space, Spin, Table, Typography, Tooltip, Tag } from "antd"
import type { ColumnsType } from "antd/es/table"
import { 
  PlusOutlined, 
  EyeOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  FileTextOutlined,
  ExclamationCircleFilled,
} from "@ant-design/icons"
import { useAuth } from "@/components/auth-provider"
import { DocumentDetailModal } from "@/components/document-detail-modal"
import { DocumentForm } from "@/components/document-form"

// ============================================================
// INTERFACES
// ============================================================

interface DocumentListPageProps {
  open: boolean
  onClose: () => void
}

interface DocumentItem {
  DocumentID: string
  DocumentName: string
  CreatedDate: string
  UnitID: string
  StatusID: string
  StatusName: string
  //Content: string
}

interface DocumentFormData {
  DocumentID: string
  DocumentName: string
  CreatedDate: string
  UnitID: string
  StatusID: string
  StatusName: string
  Content: string
  attachments?: any[]
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function DocumentListPage({ open, onClose }: DocumentListPageProps) {
  const { message, modal } = App.useApp()
  const { user } = useAuth()

  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState<DocumentItem[]>([])

  // State cho modal chi tiết
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)

  // State cho form thêm/sửa
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingDocument, setEditingDocument] = useState<DocumentFormData | null>(null)

  // ============================================================
  // LOAD DATA
  // ============================================================

  useEffect(() => {
    if (open && user?.userId) {
      loadDocuments()
    }
  }, [open, user])

  const loadDocuments = async () => {
    if (!user?.userId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/documents?userId=${user.userId}`)
      const result = await response.json()

      if (result.success) {
        setDocuments(result.data || [])
      } else {
        message.error(result.message || "Không tải được danh sách tài liệu")
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách tài liệu:", error)
      message.error("Lỗi kết nối server")
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // FORMAT HELPERS
  // ============================================================

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—"
    try {
      const date = new Date(dateStr)
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
    } catch {
      return dateStr
    }
  }

  // ============================================================
  // HANDLERS
  // ============================================================

  // Xem chi tiết
  const handleView = (documentId: string) => {
    setSelectedDocumentId(documentId)
    setDetailModalOpen(true)
  }

  // Sửa
  const handleEdit = async (record: DocumentItem) => {
    // Load chi tiết trước khi mở form
    try {
      const response = await fetch(`/api/documents?documentId=${record.DocumentID}`)
      const result = await response.json()

      if (result.success) {
        setEditingDocument({
        DocumentID: result.data.document.DocumentID,
        DocumentName: result.data.document.DocumentName,
        CreatedDate: result.data.document.CreatedDate,
        UnitID: result.data.document.UnitID,
        StatusID: result.data.document.StatusID,
        StatusName: result.data.document.StatusName,
        Content: result.data.document.Content || "",
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

  // Thêm mới
  const handleAdd = () => {
    setEditingDocument(null)
    setFormModalOpen(true)
  }

  // Xóa
  const handleDelete = (record: DocumentItem) => {
    modal.confirm({
      title: "Xác nhận xóa",
      icon: <ExclamationCircleFilled />,
      content: "Bạn có chắc chắn muốn xóa tài liệu này không?",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          const response = await fetch(
            `/api/documents?documentId=${record.DocumentID}`,
            { method: 'DELETE' }
          )
          const result = await response.json()

          if (result.success) {
            message.success("Xóa thành công.")
            loadDocuments()
          } else {
            message.error(result.message || "Lỗi khi xóa tài liệu")
          }
        } catch (error) {
          console.error("Lỗi khi xóa:", error)
          message.error("Lỗi kết nối server")
        }
      },
    })
  }

  // Callback khi form thành công
  const handleFormSuccess = () => {
    loadDocuments()
  }

  // ============================================================
  // TABLE COLUMNS
  // ============================================================

  const columns: ColumnsType<DocumentItem> = [
    {
      title: "Tên tài liệu",
      dataIndex: "DocumentName",
      key: "DocumentName",
      render: (text: string, record) => (
        <Button
          type="link"
          onClick={() => handleView(record.DocumentID)}
          style={{ padding: 0, textAlign: "left" }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "CreatedDate",
      key: "CreatedDate",
      width: 130,
      render: (date: string) => formatDate(date),
    },
    // {
    //   title: "Đơn vị",
    //   dataIndex: "UnitID",
    //   key: "UnitID",
    //   width: 200,
    //   render: (text: string) => text || "—",
    // },
    {
      title: "Trạng thái",
      dataIndex: "StatusName",
      key: "StatusName",
      width: 150,
      render: (text: string) => text || "—",
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 180,
      render: (_: any, record: DocumentItem) => (
        <Space>
          <Tooltip title="Xem">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record.DocumentID)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              size="small"
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
    <>
      <Modal
        open={open}
        title={
          <Space>
            <FileTextOutlined style={{ color: "#4b5320" }} />
            <span style={{ color: "#4b5320" }}>Danh sách tài liệu quân lực</span>
          </Space>
        }
        onCancel={onClose}
        footer={null}
        width={1000}
        destroyOnHidden
      >
        {/* Nút Thêm mới */}
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            style={{ background: "#4b5320", borderColor: "#4b5320" }}
          >
            Thêm mới
          </Button>
        </div>

        {/* Bảng danh sách */}
        <Spin spinning={loading}>
          {documents.length > 0 ? (
            <Table<DocumentItem>
              rowKey="DocumentID"
              columns={columns}
              dataSource={documents}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Tổng ${total} tài liệu`,
              }}
              size="middle"
              bordered
              onRow={(record) => ({
                onClick: () => handleView(record.DocumentID),
                style: { cursor: "pointer" },
              })}
            />
          ) : (
            !loading && (
              <Empty description="Không có dữ liệu." />
            )
          )}
        </Spin>
      </Modal>

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
        onSuccess={handleFormSuccess}
      />
    </>
  )
}
