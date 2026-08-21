/**
 * File: app/backup/page.tsx
 * Mô tả: Trang quản lý Backup dữ liệu
 * Cập nhật: 2026-08-19
 */

"use client"

import { useState, useEffect } from "react"
import { App, Button, Card, Table, Tag, Typography, Space, Modal, Progress, Popconfirm, Row, Col, Statistic, Divider } from "antd"
import type { ColumnsType } from "antd/es/table"
import {
  DatabaseOutlined,
  CloudDownloadOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FolderOutlined,
  FileOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons"
import { PageLayout } from "@/components/page-layout"
import { useAuth } from "@/components/auth-provider"
import dayjs from "dayjs"

const { Title, Text } = Typography

// ============================================================
// INTERFACES
// ============================================================

interface BackupInfo {
  name: string
  path: string
  size: number
  created: string
  type: "database" | "files"
}

// ============================================================
// HELPERS
// ============================================================

function formatFileSize(bytes: number) {
  if (!bytes || bytes === 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return "—"
  try {
    return dayjs(dateStr).format("DD/MM/YYYY HH:mm")
  } catch {
    return dateStr
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function BackupPage() {
  const { message } = App.useApp()
  const { user } = useAuth()

  // Check quyền: chỉ U002 được quản lý backup
  const canManage = user?.userId === 'U002'

  const [loading, setLoading] = useState(false)
  const [backupLoading, setBackupLoading] = useState(false)
  const [databaseBackups, setDatabaseBackups] = useState<BackupInfo[]>([])
  const [fileBackups, setFileBackups] = useState<BackupInfo[]>([])

  // Load danh sách backup
  useEffect(() => {
    if (user?.userId) {
      loadBackups()
    }
  }, [user])

  const loadBackups = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/backup')
      const result = await response.json()

      if (result.success) {
        setDatabaseBackups(result.data.database || [])
        setFileBackups(result.data.files || [])
      } else {
        message.error(result.message || 'Lỗi khi tải danh sách backup')
      }
    } catch (error) {
      console.error('Lỗi khi tải backup:', error)
      message.error('Lỗi kết nối server')
    } finally {
      setLoading(false)
    }
  }

  // Trigger backup thủ công
  const handleBackup = async (type: 'all' | 'database' | 'files') => {
    if (!canManage) {
      message.error('Bạn không có quyền thực hiện backup')
      return
    }

    Modal.confirm({
      title: 'Xác nhận backup',
      content: type === 'all' 
        ? 'Bạn có muốn backup toàn bộ dữ liệu (database + files)?'
        : type === 'database'
        ? 'Bạn có muốn backup database?'
        : 'Bạn có muốn backup các file uploads?',
      okText: 'Backup',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          setBackupLoading(true)
          const response = await fetch('/api/backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, userId: user?.userId }),
          })
          const result = await response.json()

          if (result.success) {
            message.success('Backup hoàn tất thành công')
            loadBackups()
          } else {
            message.error(result.message || 'Lỗi khi thực hiện backup')
          }
        } catch (error) {
          console.error('Lỗi khi backup:', error)
          message.error('Lỗi kết nối server')
        } finally {
          setBackupLoading(false)
        }
      },
    })
  }

  // Xóa backup
  const handleDelete = async (backup: BackupInfo) => {
    if (!canManage) {
      message.error('Bạn không có quyền xóa backup')
      return
    }

    try {
      const response = await fetch(
        `/api/backup?path=${encodeURIComponent(backup.path)}&userId=${user?.userId}`,
        { method: 'DELETE' }
      )
      const result = await response.json()

      if (result.success) {
        message.success('Đã xóa backup')
        loadBackups()
      } else {
        message.error(result.message || 'Lỗi khi xóa backup')
      }
    } catch (error) {
      console.error('Lỗi khi xóa backup:', error)
      message.error('Lỗi kết nối server')
    }
  }

  // Tính tổng dung lượng
  const totalDbSize = databaseBackups.reduce((sum, b) => sum + b.size, 0)
  const totalFileSize = fileBackups.length * 100 * 1024 * 1024 // Ước tính 100MB mỗi backup files

  // Cột cho bảng backup database
  const dbColumns: ColumnsType<BackupInfo> = [
    {
      title: "Tên file",
      dataIndex: "name",
      key: "name",
      render: (text: string) => (
        <Space>
          <DatabaseOutlined style={{ color: "#1890ff" }} />
          <Text style={{ fontSize: 13 }}>{text}</Text>
        </Space>
      ),
    },
    {
      title: "Dung lượng",
      dataIndex: "size",
      key: "size",
      width: 120,
      align: "right",
      render: (size: number) => <Text style={{ fontSize: 13 }}>{formatFileSize(size)}</Text>,
    },
    {
      title: "Thời gian tạo",
      dataIndex: "created",
      key: "created",
      width: 180,
      render: (date: string) => (
        <Space>
          <ClockCircleOutlined style={{ color: "#8c8c8c" }} />
          <Text style={{ fontSize: 13 }}>{formatDateTime(date)}</Text>
        </Space>
      ),
      sorter: (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime(),
      defaultSortOrder: "descend",
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 100,
      align: "center",
      render: (_: any, record: BackupInfo) => (
        <Popconfirm
          title="Xóa backup này?"
          description="Backup sẽ bị xóa vĩnh viễn"
          onConfirm={() => handleDelete(record)}
          okText="Xóa"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            size="small"
            disabled={!canManage}
          />
        </Popconfirm>
      ),
    },
  ]

  // Cột cho bảng backup files
  const fileColumns: ColumnsType<BackupInfo> = [
    {
      title: "Tên thư mục",
      dataIndex: "name",
      key: "name",
      render: (text: string) => (
        <Space>
          <FolderOutlined style={{ color: "#faad14" }} />
          <Text style={{ fontSize: 13 }}>{text}</Text>
        </Space>
      ),
    },
    {
      title: "Loại",
      key: "type",
      width: 120,
      render: () => <Tag color="orange">Files</Tag>,
    },
    {
      title: "Thời gian tạo",
      dataIndex: "created",
      key: "created",
      width: 180,
      render: (date: string) => (
        <Space>
          <ClockCircleOutlined style={{ color: "#8c8c8c" }} />
          <Text style={{ fontSize: 13 }}>{formatDateTime(date)}</Text>
        </Space>
      ),
      sorter: (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime(),
      defaultSortOrder: "descend",
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 100,
      align: "center",
      render: (_: any, record: BackupInfo) => (
        <Popconfirm
          title="Xóa backup này?"
          description="Backup sẽ bị xóa vĩnh viễn"
          onConfirm={() => handleDelete(record)}
          okText="Xóa"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            size="small"
            disabled={!canManage}
          />
        </Popconfirm>
      ),
    },
  ]

  return (
    <PageLayout>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, color: "#212121" }}>
          <DatabaseOutlined style={{ marginRight: 12 }} />
          Quản lý Backup
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          Sao lưu và khôi phục dữ liệu hệ thống. Backup tự động chạy vào ngày 1 hàng tháng lúc 02:00.
        </Text>
      </div>

      {/* Thống kê */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Backup Database"
              value={databaseBackups.length}
              suffix="lần"
              prefix={<DatabaseOutlined style={{ color: "#1890ff" }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Dung lượng Database"
              value={formatFileSize(totalDbSize)}
              prefix={<FileOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Backup Files"
              value={fileBackups.length}
              suffix="lần"
              prefix={<FolderOutlined style={{ color: "#faad14" }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Backup gần nhất"
              value={
                databaseBackups.length > 0
                  ? formatDateTime(databaseBackups[0].created)
                  : "Chưa có"
              }
              prefix={<ClockCircleOutlined style={{ color: "#8c8c8c" }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Nút hành động */}
      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: "16px" } }}>
        <Space size={16}>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => handleBackup('all')}
            loading={backupLoading}
            disabled={!canManage}
            style={{ background: "#3a4d2e", borderColor: "#3a4d2e" }}
          >
            Backup toàn bộ
          </Button>
          <Button
            icon={<DatabaseOutlined />}
            onClick={() => handleBackup('database')}
            loading={backupLoading}
            disabled={!canManage}
          >
            Backup Database
          </Button>
          <Button
            icon={<FolderOutlined />}
            onClick={() => handleBackup('files')}
            loading={backupLoading}
            disabled={!canManage}
          >
            Backup Files
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadBackups}
            loading={loading}
          >
            Làm mới
          </Button>
        </Space>
      </Card>

      {/* Bảng Backup Database */}
      <Card 
        title={
          <Space>
            <DatabaseOutlined style={{ color: "#1890ff" }} />
            <span>Backup Database</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Table<BackupInfo>
          rowKey="path"
          columns={dbColumns}
          dataSource={databaseBackups}
          loading={loading}
          pagination={{ pageSize: 5 }}
          size="middle"
        />
      </Card>

      {/* Bảng Backup Files */}
      <Card 
        title={
          <Space>
            <FolderOutlined style={{ color: "#faad14" }} />
            <span>Backup Files (Avatar, Tài liệu)</span>
          </Space>
        }
      >
        <Table<BackupInfo>
          rowKey="path"
          columns={fileColumns}
          dataSource={fileBackups}
          loading={loading}
          pagination={{ pageSize: 5 }}
          size="middle"
        />
      </Card>

      {/* Hướng dẫn */}
      <Card style={{ marginTop: 16 }} styles={{ body: { padding: "16px 24px" } }}>
        <Title level={5} style={{ marginTop: 0 }}>
          <CheckCircleOutlined style={{ color: "#52c41a", marginRight: 8 }} />
          Thông tin Backup
        </Title>
        <div style={{ fontSize: 14, lineHeight: 1.8, color: "#4b5563" }}>
          <p><strong>• Lịch backup tự động:</strong> Ngày 1 hàng tháng lúc 02:00 AM</p>
          <p><strong>• Thư mục backup:</strong> C:\QuanLyQuanLuc_Backups</p>
          <p><strong>• Thời gian lưu trữ:</strong> 6 tháng (tự động xóa backup cũ)</p>
          <p><strong>• Cách khôi phục:</strong> Chạy script <code>scripts\backup\restore-database.bat</code></p>
          <p><strong>• Cài đặt lại lịch backup:</strong> Chạy script <code>scripts\backup\setup-scheduler.bat</code> với quyền Administrator</p>
        </div>
      </Card>
    </PageLayout>
  )
}
