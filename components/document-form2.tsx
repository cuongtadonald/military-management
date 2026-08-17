/**
 * File: components/document-form.tsx
 * Mô tả: Form Thêm/Sửa tài liệu quân lực - thiết kế lại
 * Cập nhật: 2026-08-16
 */

"use client"

import type { UploadFile } from "antd"
import { useEffect, useState } from "react"
import { App, Button, Col, Form, Input, Modal, Row, Select, Upload, Space, Tag, Popconfirm, Typography, Divider } from "antd"
import {
  DeleteOutlined,
  UploadOutlined,
  FileOutlined,
  FileWordOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  DownloadOutlined,
  InboxOutlined,
} from "@ant-design/icons"
import { useAuth } from "@/components/auth-provider"

const { TextArea } = Input
const { Dragger } = Upload

// ============================================================
// INTERFACES
// ============================================================

interface DocumentFormProps {
  open: boolean
  onClose: () => void
  document?: DocumentData | null
  onSuccess?: () => void
}

interface DocumentData {
  DocumentID: string
  DocumentName: string
  CreatedDate: string
  UnitID: string
  StatusID: string
  StatusName: string
  Content: string
  attachments?: AttachmentFile[]
}

interface AttachmentFile {
  FileID: string
  FileName: string
  FilePath: string
  UploadedDate: string
}

// ============================================================
// CONSTANTS
// ============================================================

const STATUS_OPTIONS = [
  { value: "ST101", label: "Hiệu lực" },
  { value: "ST102", label: "Hết hiệu lực" },
]

// ============================================================
// HELPERS
// ============================================================

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
      return <FileOutlined style={{ color: "#8c8c8c" }} />
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function DocumentForm({ open, onClose, document: documentProp, onSuccess }: DocumentFormProps) {
  const { message } = App.useApp()
  const { user } = useAuth()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  // File uploads
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [existingFiles, setExistingFiles] = useState<AttachmentFile[]>([])
  const [deletedFileIds, setDeletedFileIds] = useState<string[]>([])

  const isEditMode = !!documentProp

  // ============================================================
  // FORM INIT
  // ============================================================

  useEffect(() => {
    if (open) {
      if (documentProp) {
        // Mode Sửa - fill data
        form.setFieldsValue({
          DocumentName: documentProp.DocumentName,
          StatusID: documentProp.StatusID || 'ST101',
          Content: documentProp.Content || '',
        })

        // Load file đính kèm hiện có
        if (documentProp.attachments) {
          setExistingFiles(documentProp.attachments)
        }
      } else {
        // Mode Thêm - reset form
        form.resetFields()
        setFileList([])
        setExistingFiles([])
        setDeletedFileIds([])
      }
    }
  }, [open, documentProp, form])

  // ============================================================
  // FILE HANDLING
  // ============================================================

  const handleFileChange = ({ fileList: newFileList }: any) => {
    setFileList(newFileList)
  }

  const handleRemoveExistingFile = (fileId: string) => {
    setExistingFiles(existingFiles.filter(f => f.FileID !== fileId))
    setDeletedFileIds([...deletedFileIds, fileId])
  }

  const handleDownloadFile = (file: AttachmentFile) => {
    const link = document.createElement('a')
    link.href = file.FilePath
    link.download = file.FileName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      let response: Response
      const formData = new FormData()

      if (isEditMode && documentProp) {
        // ============================
        // CẬP NHẬT TÀI LIỆU
        // ============================
        formData.append("DocumentID", documentProp.DocumentID)
        formData.append("DocumentName", values.DocumentName)
        formData.append("UnitID", values.UnitID || user?.unitId || "")
        formData.append("StatusID", values.StatusID || "ST101")
        formData.append("Content", values.Content || "")
        formData.append("ModifiedBy", user?.userId || "")

        // Các file mới
        fileList.forEach((file) => {
          if (file.originFileObj) {
            formData.append("files", file.originFileObj)
          }
        })

        // ID các file cần xóa
        formData.append(
          "deletedFileIds",
          JSON.stringify(deletedFileIds)
        )

        response = await fetch("/api/documents", {
          method: "PUT",
          body: formData,
        })
      } else {
        // ============================
        // THÊM TÀI LIỆU MỚI
        // ============================
        formData.append("DocumentName", values.DocumentName)
        formData.append("UnitID", user?.unitId || "")
        formData.append("StatusID", values.StatusID || "ST101")
        formData.append("Content", values.Content || "")
        formData.append("CreatedBy", user?.userId || "")

        // Thêm các file
        fileList.forEach((file) => {
          if (file.originFileObj) {
            formData.append("files", file.originFileObj)
          }
        })

        response = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        })
      }

      const result = await response.json()

      if (result.success) {
        message.success(
          isEditMode
            ? "Đã cập nhật tài liệu"
            : "Đã thêm tài liệu mới"
        )

        form.resetFields()
        setFileList([])
        setExistingFiles([])
        setDeletedFileIds([])

        onSuccess?.()
        onClose()
      } else {
        message.error(
          result.message || "Có lỗi xảy ra"
        )
      }
    } catch (error: any) {
      if (error.errorFields) {
        message.error(
          "Vui lòng điền đầy đủ thông tin bắt buộc"
        )
      } else {
        console.error("Lỗi:", error)
        message.error("Có lỗi xảy ra")
      }
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileOutlined style={{ color: "#3a4d2e", fontSize: 20 }} />
          <span style={{ color: "#3a4d2e", fontSize: 18, fontWeight: 600 }}>
            {isEditMode ? "Cập nhật tài liệu" : "Thêm tài liệu mới"}
          </span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={700}
      centered
      footer={[
        <Button key="cancel" onClick={onClose} size="large">
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          loading={loading}
          size="large"
          style={{ background: "#3a4d2e", borderColor: "#3a4d2e" }}
        >
          {isEditMode ? "Cập nhật" : "Thêm mới"}
        </Button>,
      ]}
      styles={{ body: { padding: "20px 24px" } }}
    >
      <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            StatusID: "ST101",
          }}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="DocumentName"
                label={
                  <span style={{ fontWeight: 500 }}>
                    Tên tài liệu <span style={{ color: "#ff4d4f" }}>*</span>
                  </span>
                }
                rules={[{ required: true, message: "Vui lòng nhập tên tài liệu" }]}
              >
                <Input placeholder="Nhập tên tài liệu" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="StatusID"
                label={<span style={{ fontWeight: 500 }}>Trạng thái</span>}
              >
                <Select options={STATUS_OPTIONS} placeholder="Chọn trạng thái" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="Content"
                label={<span style={{ fontWeight: 500 }}>Nội dung</span>}
              >
                <TextArea
                  rows={6}
                  placeholder="Nhập nội dung tài liệu"
                  style={{ resize: "vertical" }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          {/* File đính kèm */}
          <div>
            <Typography.Text strong style={{ display: "block", marginBottom: 12, fontSize: 15 }}>
              Tệp đính kèm
            </Typography.Text>

            {/* File hiện có (chỉ hiển thị khi sửa) */}
            {existingFiles.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Typography.Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
                  File đã tải lên:
                </Typography.Text>
                <Space direction="vertical" style={{ width: "100%" }} size={8}>
                  {existingFiles.map(file => (
                    <div
                      key={file.FileID}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        background: "#f9fafb",
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <Space>
                        {getFileIcon(file.FileName)}
                        <div>
                          <div style={{ fontWeight: 500 }}>{file.FileName}</div>
                        </div>
                      </Space>
                      <Space>
                        <Button
                          type="link"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownloadFile(file)}
                          size="small"
                        >
                          Tải xuống
                        </Button>
                        <Popconfirm
                          title="Xóa file này?"
                          description="File sẽ bị xóa vĩnh viễn"
                          onConfirm={() => handleRemoveExistingFile(file.FileID)}
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                        >
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                          />
                        </Popconfirm>
                      </Space>
                    </div>
                  ))}
                </Space>
              </div>
            )}

            {/* Upload file mới */}
            <Dragger
              multiple
              fileList={fileList}
              onChange={handleFileChange}
              beforeUpload={() => false}
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              style={{ padding: "20px 0" }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ fontSize: 40, color: "#3a4d2e" }} />
              </p>
              <p className="ant-upload-text" style={{ fontSize: 15, fontWeight: 500 }}>
                Kéo thả file vào đây hoặc click để chọn
              </p>
              <p className="ant-upload-hint">
                Hỗ trợ: PDF, Word, Excel. Dung lượng tối đa 50MB/tệp
              </p>
            </Dragger>
          </div>
        </Form>
      </div>
    </Modal>
  )
}
