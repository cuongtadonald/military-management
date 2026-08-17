/**
 * File: components/document-form.tsx
 * Mô tả: Form Thêm/Sửa tài liệu quân lực
 * Cập nhật: 2026-07-21
 * 
 * Form modal với các trường:
 * - Tên tài liệu
 * - Đơn vị
 * - Trạng thái
 * - Nội dung
 * - File đính kèm (upload nhiều file)
 */

"use client"

import type { UploadFile } from "antd"
import { useEffect, useState } from "react"
import { App, Button, Col, Form, Input, Modal, Row, Select, Upload, Space, Tag, Popconfirm, Typography } from "antd"
import { PlusOutlined, DeleteOutlined, UploadOutlined, FileOutlined, DownloadOutlined } from "@ant-design/icons"
import { useAuth } from "@/components/auth-provider"

const { TextArea } = Input

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
  FileID:string
  ReferenceType:string
  FileName:string
  FilePath:string
  UploadedDate:string
}

interface UploadedFile {
  uid: string
  name: string
  size?: number
  status?: string
  url?: string
  file?: File
}

// ============================================================
// STATIC OPTIONS
// ============================================================

const STATUS_OPTIONS = [
  { value: "ST101", label: "DRAFT - Tài liệu đang sử dụng" },
  { value: "ST102", label: "PENDING - Tài liệu hết hiệu lực" },
  { value: "ST103", label: "APPROVED - Tài liệu lưu trữ" },
  { value: "ST104", label: "REJECTED - Tài liệu bị hủy" },
]

// ============================================================
// MAIN COMPONENT
// ============================================================

export function DocumentForm({ open, onClose, document: documentProp, onSuccess }: DocumentFormProps) {
  const { message } = App.useApp()
  const { user } = useAuth()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  
  // Dropdown data
  const [unitTree, setUnitTree] = useState<any[]>([])
  
  // File uploads
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [existingFiles, setExistingFiles] = useState<AttachmentFile[]>([])
  const [deletedFileIds, setDeletedFileIds] = useState<string[]>([])
  
  const isEditMode = !!documentProp

  // ============================================================
  // LOAD DROPDOWN DATA
  // ============================================================

  useEffect(() => {
    if (open && user?.userId) {
      loadUnitTree()
    }
  }, [open, user])

  const loadUnitTree = async () => {
    const userId = user?.userId
    if (!userId) return

    try {
      const response = await fetch(`/api/units?userId=${userId}`)
      const result = await response.json()
      
      if (result.success) {
        setUnitTree(result.data || [])
      }
    } catch (error) {
      console.error("Lỗi khi tải đơn vị:", error)
    }
  }

  // ============================================================
  // FORM INIT
  // ============================================================

  useEffect(() => {
    if (open) {
      if (documentProp) {
        // Mode Sửa - fill data
        form.setFieldsValue({
          DocumentName: documentProp.DocumentName,
          UnitID: documentProp.UnitID,
          StatusID: documentProp.StatusID || 'ST101',
          Content: documentProp.Content || '',
        })
        
        // Load file đính kèm hiện có
        loadDocumentDetail(documentProp.DocumentID)
      } else {
        // Mode Thêm - reset form
        form.resetFields()
        setFileList([])
        setExistingFiles([])
        setDeletedFileIds([])
      }
    }
  }, [open, documentProp, form])

  const loadDocumentDetail = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents?documentId=${documentId}`)
      const result = await response.json()

      if (result.success) {
        setExistingFiles(result.data.attachments || [])
      }
    } catch (error) {
      console.error("Lỗi khi tải chi tiết tài liệu:", error)
    }
  }

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
    // Tạo link download
    const link = document.createElement('a')
    link.href = file.FilePath
    link.download = file.FileName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Format kích thước file
  // const formatFileSize = (bytes: number) => {
  //   if (!bytes || bytes === 0) return ""
  //   if (bytes < 1024) return `${bytes} B`
  //   if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  //   return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  // }

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      // Chuẩn bị danh sách file mới upload
      const newAttachments = fileList
        .filter(f => f.originFileObj)
        .map(f => ({
        FileName:f.name,
        FilePath:''
        }))

      let response
      if (isEditMode && documentProp) {
        // Cập nhật
        response = await fetch('/api/documents', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            DocumentID: documentProp.DocumentID,
            DocumentName: values.DocumentName,
            UnitID: values.UnitID,
            StatusID: values.StatusID || 'ST101',
            Content: values.Content || '',
            ModifiedBy: user?.userId,
            newAttachments,
            deletedFileIds,
          }),
        })
      } else {
        // Thêm mới
        response = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            DocumentName: values.DocumentName,
            UnitID: values.UnitID,
            StatusID: values.StatusID || 'Chọn trạng thái',
            Content: values.Content || '',
            CreatedBy: user?.userId,
            attachments: newAttachments,
          }),
        })
      }

      const result = await response.json()

      if (result.success) {
        message.success(isEditMode ? "Đã cập nhật tài liệu" : "Đã thêm tài liệu mới")
        form.resetFields()
        setFileList([])
        setExistingFiles([])
        setDeletedFileIds([])
        onSuccess?.()
        onClose()
      } else {
        message.error(result.message || "Có lỗi xảy ra")
      }
    } catch (error: any) {
      if (error.errorFields) {
        message.error("Vui lòng điền đầy đủ thông tin bắt buộc")
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
          <FileOutlined style={{ color: "#4b5320" }} />
          <span style={{ color: "#4b5320" }}>
            {isEditMode ? "Cập nhật tài liệu quân lực" : "Thêm tài liệu quân lực"}
          </span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={700}
      footer={[
        <Button key="cancel" onClick={onClose}>Hủy</Button>,
        <Button 
          key="submit" 
          type="primary" 
          onClick={handleSubmit} 
          loading={loading}
          style={{ background: "#4b5320", borderColor: "#4b5320" }}
        >
          {isEditMode ? "Cập nhật" : "Thêm mới"}
        </Button>,
      ]}
      styles={{ body: { padding: "16px 24px" } }}
      destroyOnHidden
    >
      <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            StatusID: "Chọn trạng thái",
          }}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item 
                name="DocumentName" 
                label="Tên tài liệu" 
                rules={[{ required: true, message: "Vui lòng nhập tên tài liệu" }]}
              >
                <Input placeholder="Nhập tên tài liệu" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            {/* <Col span={12}>
              <Form.Item 
                name="UnitID" 
                label="Đơn vị" 
                rules={[{ required: true, message: "Chọn đơn vị" }]}
              >
                <Select
                  placeholder="Chọn đơn vị"
                  showSearch
                  optionFilterProp="label"
                  options={unitTree.map((u: any) => ({
                    value: u.UnitID,
                    label: u.FullPathName || u.UnitName,
                  }))}
                />
              </Form.Item>
            </Col> */}
            <Col span={12}>
              <Form.Item name="StatusID" label="Trạng thái">
                <Select options={STATUS_OPTIONS} placeholder="Chọn trạng thái" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="Content" label="Nội dung">
                <TextArea 
                  rows={4} 
                  placeholder="Nhập nội dung tài liệu"
                  style={{ resize: "vertical" }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* File đính kèm */}
          <div style={{ marginBottom: 16 }}>
            <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
              File đính kèm
            </Typography.Text>

            {/* File hiện có (chỉ hiển thị khi sửa) */}
            {existingFiles.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  File đã tải lên:
                </Typography.Text>
                <Space direction="vertical" style={{ width: "100%", marginTop: 8 }}>
                  {existingFiles.map(file => (
                    <div 
                      key={file.FileID}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        background: "#fafafa",
                        borderRadius: 6,
                        border: "1px solid #d9d9d9",
                      }}
                    >
                      <Space>
                        <FileOutlined style={{ color: "#4b5320" }} />
                        <span>{file.FileName}</span>
                        {/* {file.FileSize > 0 && (
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            ({formatFileSize(file.FileSize)})
                          </Typography.Text>
                        )} */}
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
                          onConfirm={() => handleRemoveExistingFile(file.FileID)}
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                        >
                          <Button
                            type="link"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                          >
                            Xóa
                          </Button>
                        </Popconfirm>
                      </Space>
                    </div>
                  ))}
                </Space>
              </div>
            )}

            {/* Upload file mới */}
            <Upload
              multiple
              fileList={fileList}
              onChange={handleFileChange}
              beforeUpload={() => false} // Không tự động upload
            >
              <Button icon={<UploadOutlined />}>
                Chọn file
              </Button>
            </Upload>

            {existingFiles.length === 0 && fileList.length === 0 && (
              <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
                Chưa có file đính kèm.
              </Typography.Text>
            )}
          </div>
        </Form>
      </div>
    </Modal>
  )
}
