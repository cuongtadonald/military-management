"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { App, Avatar, Button, Card, Cascader, Col, Input, Layout, Modal, Row, Select, Space, Table, Tabs, Tooltip, Typography } from "antd"
import type { ColumnsType } from "antd/es/table"
import { DeleteOutlined, EditOutlined, EyeOutlined, ExclamationCircleFilled, FileExcelOutlined, PlusOutlined, SearchOutlined, UploadOutlined, LogoutOutlined, FolderOutlined } from "@ant-design/icons"
import * as XLSX from "xlsx"

import { AppHeader } from "@/components/app-header"
import { StatusTag, statusLabels } from "@/components/status-tag"
import { SoldierForm } from "@/components/soldier-form"
import { useAuth } from "@/components/auth-provider"
import { soldiers as initialSoldiers, UNIT_TREE, RANK_TREE, POSITIONS, type Soldier } from "@/lib/soldiers"

const { Content } = Layout

export function Dashboard() {
  const router = useRouter()
  const { message } = App.useApp()
  const { user, logout, hasPermission, isLoading } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [data, setData] = useState<Soldier[]>(initialSoldiers)
  const [search, setSearch] = useState("")
  const [unit, setUnit] = useState<string[] | undefined>()
  const [rank, setRank] = useState<string[] | undefined>()
  const [position, setPosition] = useState<string | undefined>()
  const [toDelete, setToDelete] = useState<Soldier | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingSoldier, setEditingSoldier] = useState<Soldier | null>(null)
  const [activeTab, setActiveTab] = useState<"active" | "discharged">("active")

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const unitStr = unit ? unit.join(" > ") : ""
    const rankStr = rank ? rank.join(" > ") : ""

    return data.filter((s) => {
      const matchesSearch = !q || s.fullName.toLowerCase().includes(q) || s.citizenId.toLowerCase().includes(q)
      const matchesUnit = !unit || s.unit.includes(unitStr)
      const matchesRank = !rank || s.rank.includes(rankStr)
      const matchesPosition = !position || s.position === position
      return matchesSearch && matchesUnit && matchesRank && matchesPosition
    })
  }, [data, search, unit, rank, position])

  const filteredActiveCount = baseFiltered.filter((s) => s.status !== "Discharged").length
  const filteredDischargedCount = baseFiltered.filter((s) => s.status === "Discharged").length
  const totalFiltered = baseFiltered.length
  const grandTotal = data.length

  const filtered = useMemo(() => {
    if (activeTab === "discharged") return baseFiltered.filter((s) => s.status === "Discharged")
    return baseFiltered.filter((s) => s.status !== "Discharged")
  }, [baseFiltered, activeTab])

  useEffect(() => {
    if (!isLoading && !user) router.push("/login")
  }, [user, isLoading, router])

  if (isLoading || !user) {
    return <Layout style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><Typography.Text>Đang kiểm tra phiên đăng nhập...</Typography.Text></Layout>
  }

  function handleExportExcel() {
    if (!hasPermission("canImportExport")) return message.warning("Bạn không có quyền xuất file Excel!")
    const exportData = filtered.map((s) => ({
      "Họ và tên": s.fullName,
      "Giới tính": s.gender,
      "Ngày sinh": s.dateOfBirth,
      "Cấp bậc": s.rank.split(" > ").pop(),
      "Đơn vị": s.unit,
      "Chức vụ": s.position,
      "Trạng thái": statusLabels[s.status],
      "Ngày nhập ngũ": s.enlistmentDate,
    }))
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab === "discharged" ? "Đã xuất ngũ" : "Đang công tác")
    XLSX.writeFile(workbook, `danh_sach_${activeTab}.xlsx`)
    message.success("Xuất file Excel thành công!")
  }

  function handleImportExcel(event: React.ChangeEvent<HTMLInputElement>) {
    if (!hasPermission("canImportExport")) return message.warning("Bạn không có quyền nhập file Excel!")
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: "array" })
        const json = XLSX.utils.sheet_to_json<any>(workbook.Sheets[workbook.SheetNames[0]])
        
        const newSoldiers: Soldier[] = json.map((row, index) => ({
          id: `IMP-${Date.now()}-${index}`,
          fullName: row["Họ và tên"] || "Chưa rõ",
          citizenId: row["CCCD/CMND"] || "Chưa rõ",
          rank: row["Cấp bậc"] || "Hạ sĩ quan & Chiến sĩ > Chiến sĩ > Binh nhì",
          unit: row["Đơn vị"] || "Trung đoàn 4 > Tiểu đoàn 1 > Đại đội 1",
          position: row["Chức vụ"] || "Chiến sĩ",
          status: (Object.keys(statusLabels) as Soldier["status"][]).find((key) => statusLabels[key] === row["Trạng thái"]) || "Active",
          enlistmentDate: row["Ngày nhập ngũ"] || "01/01/2024",
          gender: row["Giới tính"] || "Nam",
          dateOfBirth: row["Ngày sinh"] || "01/01/1990",
          phone: row["Số điện thoại"] || "0000000000",
          address: row["Địa chỉ"] || "Chưa cập nhật",
          avatar: "/placeholder.svg",
          hometown: "Chưa rõ",
          ethnicity: "Kinh",
          religion: "Không",
          bloodType: "O+",
          politicalStatus: "Quần chúng",
          education: "THPT",
          specialty: "Chưa phân công",
          maritalStatus: row["Tình trạng hôn nhân"] || "Chưa cập nhật",
          familyInfo: row["Thông tin gia đình"] || "Chưa rõ",
          healthStatus: row["Sức khỏe"] || "Chưa cập nhật",
          records: [],
        }))
        setData((prev) => [...newSoldiers, ...prev])
        message.success(`Đã nhập thành công ${newSoldiers.length} chiến sĩ!`)
      } catch {
        message.error("Lỗi khi đọc file Excel!")
      }
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
    reader.readAsArrayBuffer(file)
  }

  function handleFormSubmit(values: Partial<Soldier>) {
    if (editingSoldier) {
      setData((prev) => prev.map((s) => (s.id === editingSoldier.id ? { ...s, ...values } as Soldier : s)))
      message.success("Cập nhật thành công!")
    } else {
      const newSoldier: Soldier = {
        id: `SLD-${Date.now()}`,
        avatar: "/placeholder.svg",
        dateOfBirth: "01/01/1990",
        hometown: "Chưa cập nhật",
        ethnicity: "Kinh",
        religion: "Không",
        enlistmentDate: "01/01/2024",
        bloodType: "O+",
        politicalStatus: "Quần chúng",
        education: "THPT",
        specialty: "Chưa phân công",
        records: [],
        phone: "0000000000",
        address: "Chưa cập nhật",
        gender: "Nam",
        rank: "Hạ sĩ quan & Chiến sĩ > Chiến sĩ > Binh nhì",
        unit: "Trung đoàn 4 > Tiểu đoàn 1 > Đại đội 1 > Trung đội 1 > Tiểu đội 1",
        maritalStatus: "Chưa cập nhật",
        familyInfo: "Chưa rõ",
        healthStatus: "Chưa cập nhật",
        ...values,
      } as Soldier
      setData((prev) => [newSoldier, ...prev])
      message.success("Thêm mới thành công!")
    }
    setFormOpen(false)
  }

  // ĐÃ CẬP NHẬT CỘT: Thêm Giới tính, Ngày sinh, và đảm bảo Cấp bậc chỉ hiện tên cuối
  const columns: ColumnsType<Soldier> = [
    { title: "Ảnh", dataIndex: "avatar", key: "avatar", width: 70, render: (avatar: string, record) => <Avatar src={avatar || "/placeholder.svg"} size={40} shape="square" alt={record.fullName} /> },
    { title: "Họ và tên", dataIndex: "fullName", key: "fullName", sorter: (a, b) => a.fullName.localeCompare(b.fullName), render: (name: string) => <div style={{ fontWeight: 600 }}>{name}</div> },
    
    // 1. Cột Giới tính (có bộ lọc ngay trên tiêu đề)
    {
      title: "Giới tính",
      dataIndex: "gender",
      key: "gender",
      width: 90,
      filters: [
        { text: "Nam", value: "Nam" },
        { text: "Nữ", value: "Nữ" },
      ],
      onFilter: (value, record) => record.gender === value,
    },
    
    // 2. Cột Ngày sinh (định dạng DD/MM/YYYY giống Ngày nhập ngũ)
    { title: "Ngày sinh", dataIndex: "dateOfBirth", key: "dateOfBirth", width: 100, responsive: ["sm"] },
    
    // 3. Cột Cấp bậc (chỉ hiện phần tử cuối cùng sau khi tách chuỗi)
    { 
      title: "Cấp bậc", 
      dataIndex: "rank", 
      key: "rank", 
      width: 110,
      responsive: ["md"],
      render: (rank: string) => rank ? rank.split(" > ").pop() : ""
    },
    
    { 
      title: "Đơn vị", 
      dataIndex: "unit", 
      key: "unit", 
      responsive: ["lg"], 
      render: (unit: string) => {
        const parts = unit.split(" > ");
        const last = parts.pop() || "";
        const parent = parts.join(" > ");
        return (
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            {parent && <span style={{ fontSize: 10, color: "#8c8c8c", marginBottom: 2 }}>{parent}</span>}
            <span style={{ fontWeight: 600, color: "#3b4019" }}>{last}</span>
          </div>
        );
      }
    },
    { title: "Chức vụ", dataIndex: "position", key: "position", responsive: ["xl"], width: 130 },
    { title: "Ngày nhập ngũ", dataIndex: "enlistmentDate", key: "enlistmentDate", responsive: ["xl"], width: 110 },
    { title: "Trạng thái", dataIndex: "status", key: "status", width: 120, render: (status: Soldier["status"]) => <StatusTag status={status} /> },
    {
      title: "Chức năng", key: "actions", width: 130, fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết"><Button type="text" icon={<EyeOutlined />} onClick={() => router.push(`/soldiers/${record.id}`)} /></Tooltip>
          {hasPermission("canEdit") && <Tooltip title="Sửa"><Button type="text" icon={<EditOutlined />} onClick={() => { setEditingSoldier(record); setFormOpen(true); }} /></Tooltip>}
          {hasPermission("canDelete") && <Tooltip title="Xoá"><Button type="text" danger icon={<DeleteOutlined />} onClick={() => setToDelete(record)} /></Tooltip>}
        </Space>
      ),
    },
  ]

  const tabItems = [
    { key: "active", label: <span><FolderOutlined style={{ marginRight: 6 }} />Đang công tác / Dự bị <span style={{ marginLeft: 8, color: "#4b5320", fontWeight: "bold" }}>({filteredActiveCount})</span></span> },
    { key: "discharged", label: <span><FolderOutlined style={{ marginRight: 6 }} />Đã xuất ngũ (Lưu trữ) <span style={{ marginLeft: 8, color: "#8c8c8c", fontWeight: "bold" }}>({filteredDischargedCount})</span></span> },
  ]

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <AppHeader />
      <Content style={{ padding: "16px", maxWidth: 1400, width: "100%", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <Typography.Title level={3} style={{ margin: 0, color: "#3b4019" }}>Quản lý hồ sơ quân nhân</Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>
              Xin chào, <strong>{user.fullName}</strong> <span style={{ margin: "0 8px" }}>|</span> Đang hiển thị: <strong style={{ color: "#4b5320" }}>{totalFiltered}</strong> / {grandTotal} quân nhân
            </Typography.Text>
          </div>
          <Button icon={<LogoutOutlined />} onClick={logout}>Đăng xuất</Button>
        </div>

        <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as "active" | "discharged")} items={tabItems} style={{ marginBottom: 16 }} />

        <Card style={{ marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12} lg={6}>
              <Input allowClear size="large" placeholder="Tìm theo tên hoặc CCCD" prefix={<SearchOutlined style={{ color: "#9aa05f" }} />} value={search} onChange={(e) => setSearch(e.target.value)} />
            </Col>
            <Col xs={12} sm={8} md={6} lg={5}>
              <Cascader size="large" style={{ width: "100%" }} placeholder="Lọc theo Đơn vị" options={UNIT_TREE} value={unit} onChange={(value) => setUnit(value as string[])} allowClear displayRender={(labels) => labels[labels.length - 1]} expandTrigger="hover" />
            </Col>
            <Col xs={12} sm={8} md={6} lg={5}>
              <Cascader size="large" style={{ width: "100%" }} placeholder="Lọc theo Cấp bậc" options={RANK_TREE} value={rank} onChange={(value) => setRank(value as string[])} allowClear displayRender={(labels) => labels[labels.length - 1]} expandTrigger="hover" />
            </Col>
            <Col xs={24} sm={8} md={6} lg={8}>
              <Select allowClear size="large" style={{ width: "100%" }} placeholder="Chức vụ" value={position} onChange={setPosition} options={POSITIONS.map((p) => ({ label: p, value: p }))} />
            </Col>
          </Row>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16, paddingTop: 16, borderTop: "1px solid #eef0e2" }}>
            {hasPermission("canCreate") && <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingSoldier(null); setFormOpen(true); }}>Thêm chiến sĩ</Button>}
            {hasPermission("canImportExport") && (
              <>
                <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" style={{ display: "none" }} />
                <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>Nhập Excel</Button>
                <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>Xuất Excel</Button>
              </>
            )}
          </div>
        </Card>

        <Card styles={{ body: { padding: 0 } }}>
          <Table<Soldier> rowKey="id" columns={columns} dataSource={filtered} scroll={{ x: 1200 }} pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total, range) => (total === 0 ? "Không có dữ liệu" : `Hiển thị ${range[0]}-${range[1]} trên tổng số ${total}`), responsive: true }} />
        </Card>
      </Content>

      <Modal open={!!toDelete} title={<Space><ExclamationCircleFilled style={{ color: "#cf1322" }} />Xác nhận xoá</Space>} okText="Xoá" okButtonProps={{ danger: true }} cancelText="Huỷ" onOk={() => { setData((prev) => prev.filter((s) => s.id !== toDelete?.id)); setToDelete(null); message.success("Đã xoá thành công"); }} onCancel={() => setToDelete(null)}>
        <Typography.Paragraph style={{ marginBottom: 0 }}>Bạn có chắc chắn muốn xoá thông tin của chiến sĩ <strong>{toDelete?.fullName}</strong>? Hành động này không thể hoàn tác.</Typography.Paragraph>
      </Modal>

      <SoldierForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleFormSubmit} initialData={editingSoldier} />
    </Layout>
  )
}