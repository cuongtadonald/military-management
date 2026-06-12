"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Input,
  Layout,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tooltip,
  Typography,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  ExclamationCircleFilled,
  FileExcelOutlined,
  FileWordOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
} from "@ant-design/icons"
import { AppHeader } from "@/components/app-header"
import { StatusTag } from "@/components/status-tag"
import { SoldierForm } from "@/components/soldier-form"
import { soldiers as initialSoldiers, RANKS, UNITS, POSITIONS, type Soldier } from "@/lib/soldiers"

const { Content } = Layout

export function Dashboard() {
  const router = useRouter()
  const { message } = App.useApp()
  const [data, setData] = useState<Soldier[]>(initialSoldiers)
  const [search, setSearch] = useState("")
  const [unit, setUnit] = useState<string | undefined>()
  const [rank, setRank] = useState<string | undefined>()
  const [position, setPosition] = useState<string | undefined>()
  const [toDelete, setToDelete] = useState<Soldier | null>(null)
  
  // State cho Form Thêm/Sửa
  const [formOpen, setFormOpen] = useState(false)
  const [editingSoldier, setEditingSoldier] = useState<Soldier | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.filter((s) => {
      const matchesSearch =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.militaryId.toLowerCase().includes(q) ||
        s.citizenId.toLowerCase().includes(q)
      const matchesUnit = !unit || s.unit === unit
      const matchesRank = !rank || s.rank === rank
      const matchesPosition = !position || s.position === position
      return matchesSearch && matchesUnit && matchesRank && matchesPosition
    })
  }, [data, search, unit, rank, position])

  function confirmDelete() {
    if (!toDelete) return
    setData((prev) => prev.filter((s) => s.id !== toDelete.id))
    message.success(`Đã xoá thông tin của ${toDelete.fullName}.`)
    setToDelete(null)
  }

  function handleAdd() {
    setEditingSoldier(null)
    setFormOpen(true)
  }

  function handleEdit(record: Soldier) {
    setEditingSoldier(record)
    setFormOpen(true)
  }

  function handleFormSubmit(values: Partial<Soldier>) {
    if (editingSoldier) {
      // Cập nhật bản ghi hiện tại
      setData((prev) =>
        prev.map((s) => (s.id === editingSoldier.id ? { ...s, ...values } as Soldier : s))
      )
    } else {
      // Thêm bản ghi mới
      const newSoldier: Soldier = {
        id: `SLD-${Date.now()}`,
        avatar: "/placeholder.svg",
        dateOfBirth: "1990-01-01",
        hometown: "Chưa cập nhật",
        ethnicity: "Kinh",
        religion: "Không",
        enlistmentDate: new Date().toISOString().split("T")[0],
        bloodType: "O+",
        politicalStatus: "Quần chúng",
        education: "THPT",
        specialty: "Chưa phân công",
        records: [],
        ...values,
      } as Soldier
      setData((prev) => [newSoldier, ...prev])
    }
  }

  const columns: ColumnsType<Soldier> = [
    {
      title: "Ảnh",
      dataIndex: "avatar",
      key: "avatar",
      width: 80,
      render: (avatar: string, record) => (
        <Avatar src={avatar || "/placeholder.svg"} size={44} shape="square" alt={record.fullName} />
      ),
    },
    {
      title: "Họ và tên",
      dataIndex: "fullName",
      key: "fullName",
      sorter: (a, b) => a.fullName.localeCompare(b.fullName),
      render: (name: string, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.militaryId}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Cấp bậc",
      dataIndex: "rank",
      key: "rank",
      sorter: (a, b) => RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank),
      responsive: ["sm"],
    },
    {
      title: "Đơn vị",
      dataIndex: "unit",
      key: "unit",
      sorter: (a, b) => a.unit.localeCompare(b.unit),
      responsive: ["md"],
    },
    {
      title: "Chức vụ",
      dataIndex: "position",
      key: "position",
      responsive: ["lg"],
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: Soldier["status"]) => <StatusTag status={status} />,
      responsive: ["sm"],
    },
    {
      title: "Chức năng",
      key: "actions",
      width: 150,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/soldiers/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="Sửa">
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title="Xoá">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => setToDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <AppHeader />
      <Content style={{ padding: "16px", maxWidth: 1400, width: "100%", margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <Typography.Title level={3} style={{ margin: 0, color: "#3b4019" }}>
            Danh sách chiến sĩ
          </Typography.Title>
          <Typography.Text type="secondary">
            Hiển thị {filtered.length} trên tổng số {data.length} quân nhân
          </Typography.Text>
        </div>

        <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12} lg={8}>
              <Input
                allowClear
                size="large"
                placeholder="Tìm kiếm theo tên, số ID quân đội"
                prefix={<SearchOutlined style={{ color: "#9aa05f" }} />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Col>
            <Col xs={24} sm={8} md={4} lg={5}>
              <Select
                allowClear
                size="large"
                style={{ width: "100%" }}
                placeholder="Đơn vị"
                value={unit}
                onChange={setUnit}
                options={UNITS.map((u) => ({ label: u, value: u }))}
              />
            </Col>
            <Col xs={12} sm={8} md={4} lg={5}>
              <Select
                allowClear
                size="large"
                style={{ width: "100%" }}
                placeholder="Cấp bậc"
                value={rank}
                onChange={setRank}
                options={RANKS.map((r) => ({ label: r, value: r }))}
              />
            </Col>
            <Col xs={12} sm={8} md={4} lg={6}>
              <Select
                allowClear
                size="large"
                style={{ width: "100%" }}
                placeholder="Chức vụ"
                value={position}
                onChange={setPosition}
                options={POSITIONS.map((p) => ({ label: p, value: p }))}
              />
            </Col>
          </Row>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid #eef0e2",
            }}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Thêm chiến sĩ
            </Button>
            <Button icon={<UploadOutlined />} onClick={() => message.info("Chức năng nhập Excel đang được phát triển.")}>
              Nhập Excel
            </Button>
            <Button icon={<FileExcelOutlined />} onClick={() => message.info("Chức năng xuất Excel đang được phát triển.")}>
              Xuất Excel
            </Button>
          </div>
        </Card>

        <Card styles={{ body: { padding: 0 } }}>
          <Table<Soldier>
            rowKey="id"
            columns={columns}
            dataSource={filtered}
            scroll={{ x: 720 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} của ${total}`,
              responsive: true,
            }}
          />
        </Card>
      </Content>

      {/* Modal xác nhận xoá */}
      <Modal
        open={!!toDelete}
        title={
          <Space>
            <ExclamationCircleFilled style={{ color: "#cf1322" }} />
            Xác nhận xoá thông tin
          </Space>
        }
        okText="Xoá"
        okButtonProps={{ danger: true }}
        cancelText="Huỷ"
        onOk={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          Bạn có chắc chắn muốn xoá thông tin của chiến sĩ{" "}
          <strong>{toDelete?.fullName}</strong> ({toDelete?.militaryId})? Hành động này không thể hoàn tác.
        </Typography.Paragraph>
      </Modal>

      {/* Modal Form Thêm/Sửa */}
      <SoldierForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingSoldier}
      />
    </Layout>
  )
}