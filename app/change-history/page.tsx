/**
 * File: app/change-history/page.tsx
 * Mô tả: Trang Lịch sử thay đổi - theo design mới
 * Filter 7 ô + Bảng 6 cột + Modal chi tiết 3 phần
 */

"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import {
  ClockCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  HistoryOutlined,
  DownloadOutlined,
} from "@ant-design/icons"
import dayjs from "dayjs"

import { PageLayout } from "@/components/page-layout"
import { useAuth } from "@/components/auth-provider"

const { RangePicker } = DatePicker
const { Title, Text } = Typography

// ============================================================
// CONSTANTS
// ============================================================

const CHANGE_TYPE_OPTIONS = [
  { value: "", label: "Chọn loại thay đổi" },
  { value: "INSERT", label: "Thêm mới" },
  { value: "UPDATE", label: "Cập nhật" },
  { value: "DELETE", label: "Xóa" },
  { value: "PERMISSION", label: "Cấp/thu hồi quyền" },
  { value: "IMPORT", label: "Import Excel" },
]

const CHANGE_TYPE_COLORS: Record<string, string> = {
  INSERT: "green",
  UPDATE: "blue",
  DELETE: "red",
  PERMISSION: "purple",
  IMPORT: "orange",
}

const CHANGE_TYPE_LABELS: Record<string, string> = {
  INSERT: "Thêm mới",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
  PERMISSION: "Cấp/thu hồi quyền",
  IMPORT: "Import Excel",
}

const SORT_OPTIONS = [
  { value: "newest", label: "Thời gian mới nhất" },
  { value: "oldest", label: "Thời gian cũ nhất" },
]

// ============================================================
// INTERFACES
// ============================================================

interface ChangeHistoryRow {
  ID: string
  ChangeHistoryID?: string
  ChangeDate: string
  ChangeType: string
  TotalSoldier?: number
  ChangeReason?: string
  ChangedByName?: string
  ChangedByAvatar?: string
  UnitName?: string
  Description?: string
}

interface ChangeHistoryDetailRow {
  DetailID: string
  SoldierID?: string | null
  SoldierName?: string | null
  CitizenID?: string | null
  UnitName?: string | null
  FullPathName?: string | null
  UnitFullPath?: string | null
  RankName?: string | null
  FieldName: string
  FieldDisplayName?: string
  OldValue?: string | null
  NewValue?: string | null
}

interface HistoryDetailResponse {
  header: any | null
  details: ChangeHistoryDetailRow[]
}

// ============================================================
// HELPERS
// ============================================================

function formatDate(value?: string) {
  if (!value) return "—"
  try {
    const date = new Date(value)
    const time = date.toLocaleTimeString("vi-VN", { hour12: false })
    const dateStr = date.toLocaleDateString("vi-VN")
    return `${time} ${dateStr}`
  } catch {
    return value
  }
}

function getHistoryId(record: ChangeHistoryRow) {
  return record.ID || record.ChangeHistoryID || ""
}

function displayValue(value?: string | null) {
  if (value === undefined || value === null || value === "") return "—"
  return value
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ChangeHistoryPage() {
  const router = useRouter()
  const { message } = App.useApp()
  const { user, isLoading } = useAuth()

  // Filter state
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [changeType, setChangeType] = useState("")
  const [operatorName, setOperatorName] = useState("")
  const [content, setContent] = useState("")
  const [soldierCount, setSoldierCount] = useState("")
  const [sortBy, setSortBy] = useState("newest")

  // Data state
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<ChangeHistoryRow[]>([])

  // Detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedHistory, setSelectedHistory] = useState<HistoryDetailResponse | null>(null)
  const [selectedSoldier, setSelectedSoldier] = useState<ChangeHistoryDetailRow | null>(null)

  // Load data
  useEffect(() => {
    if (!isLoading && user?.userId) {
      loadHistory()
    }
  }, [user, isLoading])

  const loadHistory = async () => {
    if (!user?.userId) return
    try {
      setLoading(true)
      const response = await fetch(`/api/change-history?userId=${user.userId}`)
      const result = await response.json()
      if (result.success) {
        setHistory(result.data || [])
      } else {
        message.error(result.message || "Lỗi khi tải lịch sử thay đổi")
      }
    } catch (error) {
      console.error("Lỗi khi tải lịch sử thay đổi:", error)
      message.error("Lỗi kết nối server")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    // TODO: Implement server-side filtering
    message.info("Chức năng tìm kiếm đang được phát triển")
  }

  const handleReset = () => {
    setDateRange(null)
    setChangeType("")
    setOperatorName("")
    setContent("")
    setSoldierCount("")
    setSortBy("newest")
  }

  const openHistoryDetail = async (record: ChangeHistoryRow) => {
    if (!user?.userId) return
    const id = getHistoryId(record)
    if (!id) return

    try {
      setDetailModalOpen(true)
      setDetailLoading(true)
      setSelectedSoldier(null)
      const response = await fetch(`/api/change-history/${id}?userId=${user.userId}`)
      const result = await response.json()
      if (result.success) {
        setSelectedHistory(result.data)
      } else {
        message.error(result.message || "Lỗi khi tải chi tiết lịch sử")
      }
    } catch (error) {
      console.error("Lỗi khi tải chi tiết lịch sử:", error)
      message.error("Lỗi kết nối server")
    } finally {
      setDetailLoading(false)
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

  const columns: ColumnsType<ChangeHistoryRow> = [
    {
      title: "Thời gian",
      dataIndex: "ChangeDate",
      width: 180,
      sorter: (a, b) => new Date(a.ChangeDate).getTime() - new Date(b.ChangeDate).getTime(),
      render: (date: string) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ClockCircleOutlined style={{ color: "#8c8c8c" }} />
          <Text style={{ fontSize: 13 }}>{formatDate(date)}</Text>
        </div>
      ),
    },
    {
      title: "Loại",
      dataIndex: "ChangeType",
      width: 150,
      sorter: (a, b) => a.ChangeType.localeCompare(b.ChangeType),
      render: (type: string) => (
        <Tag color={CHANGE_TYPE_COLORS[type] || "default"} style={{ fontSize: 12 }}>
          {CHANGE_TYPE_LABELS[type] || type}
        </Tag>
      ),
    },
    {
      title: "Người thao tác",
      dataIndex: "ChangedByName",
      width: 240,
      sorter: (a, b) => (a.ChangedByName || "").localeCompare(b.ChangedByName || ""),
      render: (name: string, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar size={36} style={{ background: "#4b5320", flexShrink: 0 }}>
            {name?.charAt(0)}
          </Avatar>
          <div>
            <Text strong style={{ display: "block", fontSize: 13 }}>
              {name || "—"}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.UnitName}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Nội dung",
      dataIndex: "Description",
      sorter: (a, b) => (a.Description || "").localeCompare(b.Description || ""),
      render: (_: string, record) => (
        <div>
          <Text style={{ fontSize: 13 }}>
            {record.Description || record.ChangeReason || "—"}
          </Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Mã: {getHistoryId(record)}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Số chiến sĩ",
      dataIndex: "TotalSoldier",
      width: 120,
      align: "center",
      sorter: (a, b) => (a.TotalSoldier || 0) - (b.TotalSoldier || 0),
      render: (value: number) => (
        <Text style={{ fontSize: 13, fontWeight: 500 }}>{value || 0}</Text>
      ),
    },
  ]

  // ============================================================
  // DETAIL MODAL COLUMNS
  // ============================================================

  const detailColumns: ColumnsType<ChangeHistoryDetailRow> = [
    {
      title: "STT",
      key: "index",
      width: 60,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Mã chiến sĩ",
      dataIndex: "SoldierID",
      width: 120,
      render: displayValue,
    },
    {
      title: "Họ và tên",
      dataIndex: "SoldierName",
      width: 180,
      render: (name: string) => <Text strong>{name || "—"}</Text>,
    },
    {
      title: "Đơn vị hiện tại",
      key: "unit",
      width: 200,
      render: (_, record) => {
        const parts = (record.FullPathName || record.UnitFullPath || "").split(",").map(p => p.trim()).filter(Boolean)
        const current = parts.length > 0 ? parts[parts.length - 1] : record.UnitName
        return <Text style={{ fontSize: 13 }}>{current || "—"}</Text>
      },
    },
    {
      title: "Nội dung thay đổi",
      key: "changes",
      width: 220,
      render: (_, record) => {
        const fields = record.FieldDisplayName || record.FieldName
        return <Text style={{ fontSize: 13 }}>Cập nhật {fields}</Text>
      },
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 120,
      align: "center",
      render: () => <Tag color="green">Đã thay đổi</Tag>,
    },
    {
      title: "Chi tiết",
      key: "action",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Button
          size="small"
          type="link"
          icon={<EyeOutlined />}
          onClick={() => setSelectedSoldier(record)}
        >
          Xem chi tiết
        </Button>
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <HistoryOutlined style={{ fontSize: 24, color: "#3a4d2e" }} />
          <div>
            <Title level={3} style={{ margin: 0, color: "#212121" }}>
              Lịch sử thay đổi
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Theo dõi toàn bộ các thay đổi dữ liệu chiến sĩ và phân quyền trong hệ thống.
            </Text>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <Card style={{ marginBottom: 16, borderRadius: 8 }} styles={{ body: { padding: "20px 24px" } }}>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <div style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: 500 }}>Từ ngày</Text>
            </div>
            <DatePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              placeholder="dd/mm/yyyy"
              value={dateRange?.[0]}
              onChange={(date) => setDateRange(date ? [date, dateRange?.[1] || null] : null)}
            />
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: 500 }}>Đến ngày</Text>
            </div>
            <DatePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              placeholder="dd/mm/yyyy"
              value={dateRange?.[1]}
              onChange={(date) => setDateRange(date ? [dateRange?.[0] || null, date] : null)}
            />
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: 500 }}>Loại thay đổi</Text>
            </div>
            <Select
              style={{ width: "100%" }}
              placeholder="Chọn loại thay đổi"
              value={changeType}
              onChange={setChangeType}
              options={CHANGE_TYPE_OPTIONS}
            />
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: 500 }}>Người thao tác</Text>
            </div>
            <Input
              placeholder="Nhập tên người thao tác"
              prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={6}>
            <div style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: 500 }}>Nội dung</Text>
            </div>
            <Input
              placeholder="Nhập nội dung cần tìm"
              prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: 500 }}>Số chiến sĩ</Text>
            </div>
            <Select
              style={{ width: "100%" }}
              placeholder="Chọn số lượng"
              value={soldierCount}
              onChange={setSoldierCount}
              options={[
                { value: "", label: "Chọn số lượng" },
                { value: "0", label: "0" },
                { value: "1-10", label: "1 - 10" },
                { value: "11-50", label: "11 - 50" },
                { value: "51+", label: "Trên 50" },
              ]}
            />
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: 500 }}>Sắp xếp theo</Text>
            </div>
            <Select
              style={{ width: "100%" }}
              value={sortBy}
              onChange={setSortBy}
              options={SORT_OPTIONS}
            />
          </Col>
          <Col span={6} style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              Đặt lại
            </Button>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              style={{ background: "#3a4d2e", borderColor: "#3a4d2e" }}
            >
              Tìm kiếm
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        <Table
          rowKey={(record) => getHistoryId(record)}
          columns={columns}
          dataSource={history}
          loading={loading}
          onRow={(record) => ({
            onClick: () => openHistoryDetail(record),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `Hiển thị ${range[0]} - ${range[1]} của ${total} lịch sử`,
          }}
          scroll={{ x: 1200 }}
          size="middle"
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        open={detailModalOpen}
        onCancel={() => {
          setDetailModalOpen(false)
          setSelectedHistory(null)
          setSelectedSoldier(null)
        }}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ClockCircleOutlined style={{ color: "#3a4d2e" }} />
            <Text strong style={{ fontSize: 16 }}>Chi tiết lịch sử thay đổi</Text>
          </div>
        }
        width={1200}
        footer={
          <Button onClick={() => setDetailModalOpen(false)}>Đóng</Button>
        }
      >
        {selectedHistory && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Section 1: Thông tin phiếu thay đổi */}
            <Card
              size="small"
              title={
                <Text strong style={{ color: "#3a4d2e" }}>
                  Thông tin phiếu thay đổi
                </Text>
              }
            >
              {selectedHistory.header && (
                <Row gutter={24}>
                  <Col span={12}>
                    <div style={{ marginBottom: 12 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Mã giao dịch</Text>
                      <div style={{ fontWeight: 500 }}>
                        {getHistoryId(selectedHistory.header as ChangeHistoryRow)}
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Người thao tác</Text>
                      <div style={{ fontWeight: 500 }}>
                        {selectedHistory.header.ChangedByName || "—"}
                      </div>
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Đơn vị</Text>
                      <div style={{ fontWeight: 500 }}>
                        {selectedHistory.header.UnitName || "—"}
                      </div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ marginBottom: 12 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Thời gian</Text>
                      <div style={{ fontWeight: 500 }}>
                        {formatDate(selectedHistory.header.ChangeDate)}
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Số chiến sĩ</Text>
                      <div style={{ fontWeight: 500, color: "#3a4d2e" }}>
                        {selectedHistory.header.TotalSoldier || 0}
                      </div>
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Mô tả</Text>
                      <div style={{ fontWeight: 500 }}>
                        {selectedHistory.header.Description || selectedHistory.header.ChangeReason || "—"}
                      </div>
                    </div>
                  </Col>
                </Row>
              )}
            </Card>

            {/* Section 2: Danh sách chiến sĩ bị thay đổi */}
            <Card
              size="small"
              title={
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Text strong style={{ color: "#3a4d2e" }}>
                    Danh sách chiến sĩ bị thay đổi ({selectedHistory.details?.length || 0})
                  </Text>
                  <Space>
                    <Input
                      placeholder="Tìm theo mã chiến sĩ, họ tên..."
                      prefix={<SearchOutlined />}
                      style={{ width: 240 }}
                      size="small"
                    />
                    <Button size="small" icon={<DownloadOutlined />}>
                      Xuất danh sách
                    </Button>
                  </Space>
                </div>
              }
            >
              <Table
                rowKey={(record) => record.DetailID || `${record.SoldierID}-${record.FieldName}`}
                columns={detailColumns}
                dataSource={selectedHistory.details || []}
                loading={detailLoading}
                pagination={{
                  pageSize: 5,
                  showSizeChanger: true,
                  showTotal: (total, range) => `Hiển thị ${range[0]} - ${range[1]} của ${total} chiến sĩ`,
                }}
                size="small"
                scroll={{ x: 1000 }}
              />
            </Card>

            {/* Section 3: Chi tiết thay đổi của chiến sĩ */}
            {selectedSoldier && (
              <Card
                size="small"
                title={
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <Text strong style={{ color: "#3a4d2e" }}>
                        Chi tiết thay đổi của: {selectedSoldier.SoldierName} ({selectedSoldier.SoldierID})
                      </Text>
                      <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 4 }}>
                        Các trường hiển thị là những thay đổi trong phiếu này.
                      </div>
                    </div>
                    <Button size="small" onClick={() => setSelectedSoldier(null)}>
                      Đóng chi tiết
                    </Button>
                  </div>
                }
              >
                <Table
                  rowKey={(record) => record.FieldName}
                  dataSource={[selectedSoldier]}
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: "Trường thông tin",
                      dataIndex: "FieldDisplayName",
                      width: 200,
                      render: (value, record) => value || record.FieldName,
                    },
                    {
                      title: "Giá trị cũ",
                      dataIndex: "OldValue",
                      width: 200,
                      render: displayValue,
                    },
                    {
                      title: "Giá trị mới",
                      dataIndex: "NewValue",
                      width: 200,
                      render: (value) => (
                        <Text style={{ color: "#52c41a", fontWeight: 500 }}>
                          {displayValue(value)}
                        </Text>
                      ),
                    },
                  ]}
                />
              </Card>
            )}
          </div>
        )}
      </Modal>
    </PageLayout>
  )
}
