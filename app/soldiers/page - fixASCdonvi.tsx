/**
 * File: app/soldiers/page.tsx
 * Mô tả: Danh sách quân nhân - giao diện theo thiết kế mới
 */

"use client"

import { useMemo, useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { App, Avatar, Button, Card, Col, DatePicker, Input, Layout, Modal, Row, Select, Space, Table, Tabs, Tooltip, Typography, TreeSelect } from "antd"
import type { ColumnsType } from "antd/es/table"
import { DeleteOutlined, EditOutlined, EyeOutlined, ExclamationCircleFilled, FileExcelOutlined, PlusOutlined, SearchOutlined, UploadOutlined, SendOutlined, CalendarOutlined, FilterOutlined } from "@ant-design/icons"

import { PageLayout } from "@/components/page-layout"
import { StatusTag } from "@/components/status-tag"
import { SoldierForm } from "@/components/soldier-form"
import { ChangeReportTab } from "@/components/change-report-tab"
import SendNotificationTab from "@/components/send-notification-tab"
import { useAuth } from "@/components/auth-provider"
import { useChangeLog } from "@/lib/change-log"

// ============================================================
// INTERFACES
// ============================================================

interface SoldierData {
  SoldierID: string
  FullName: string
  DateOfBirth: string
  Gender: number
  CitizenID: string
  UnitID: string
  UnitName: string
  UnitShortName?: string
  UnitHierarchyPath?: string
  UnitFullPath: string
  Position: string
  RankName: string
  StatusName: string
  Ethnicity: string
  ReligionName: string
  MaritalStatusName: string
  EducationLevel: string
  Specialization: string
  PoliticalLevel: string
  BloodType: string
  HealthClassification: string
  Height: number
  Weight: number
  BloodPressure: string
  Hometown: string
  Address: string
  WardName: string
  ProvinceName: string
  EnlistmentDate: string
  PartyJoinDate?: string
  YouthUnionJoinDate?: string
  PhotoPath: string
  FileID: string
  CreatedDate: string
  CreatedBy: string
  LastModifiedDate: string
  LastModifiedBy: string
}

interface UnitTreeNode {
  title: string
  value: string
  key: string
  children?: UnitTreeNode[]
  isLeaf?: boolean
  unitId: string
}

// ============================================================
// CUSTOM HOOKS
// ============================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function SoldierListPage() {
  const router = useRouter()
  const { message } = App.useApp()
  const { user, isLoading, hasPermission } = useAuth()
  const { pendingCount } = useChangeLog()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeData, setActiveData] = useState<SoldierData[]>([])
  const [dischargedData, setDischargedData] = useState<SoldierData[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [selectedUnitId, setSelectedUnitId] = useState<string | undefined>(undefined)
  const [unitTreeData, setUnitTreeData] = useState<UnitTreeNode[]>([])
  const [unitTreeLoading, setUnitTreeLoading] = useState(false)
  const [unitSearchText, setUnitSearchText] = useState("")
  const [expandedUnitKeys, setExpandedUnitKeys] = useState<string[]>([])

  // New filter states
  const [rankFilter, setRankFilter] = useState<string | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [rankOptions, setRankOptions] = useState<{ value: string; label: string }[]>([])

  const [activePagination, setActivePagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [dischargedPagination, setDischargedPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  const debouncedSearch = useDebounce(search, 400)
  const debouncedTreeSearchText = useDebounce(unitSearchText, 400)

  const [activeTab, setActiveTab] = useState<"active" | "discharged" | "changelog" | "notification">("active")
  const [soldierFormOpen, setSoldierFormOpen] = useState(false)
  const [editingSoldier, setEditingSoldier] = useState<SoldierData | null>(null)

  const handleAddSoldier = () => { router.push('/soldiers/add') }
  const handleEditSoldier = (soldier: SoldierData) => { setEditingSoldier(soldier); setSoldierFormOpen(true) }
  const handleFormSuccess = () => { void loadSoldiers('0'); void loadSoldiers('1') }

  const currentUser = user

  // ============================================================
  // DATA FETCHING
  // ============================================================

  const loadSoldiers = useCallback(async (mode: '0' | '1', pageArg?: number, pageSizeArg?: number) => {
    if (!currentUser?.userId) return
    const pagination = mode === '0' ? activePagination : dischargedPagination
    const page = pageArg ?? pagination.current
    const pageSize = pageSizeArg ?? pagination.pageSize
    try {
      const params = new URLSearchParams({
        userId: currentUser.userId, mode, page: String(page), pageSize: String(pageSize),
      })
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      if (selectedUnitId) params.set('unitId', selectedUnitId)
      const response = await fetch(`/api/soldiers?${params.toString()}`)
      const result = await response.json()
      if (result.success) {
        const nextPagination = { current: result.page ?? page, pageSize: result.pageSize ?? pageSize, total: result.total ?? result.count ?? 0 }
        if (mode === '0') { setActiveData(result.data); setActivePagination(nextPagination) }
        else { setDischargedData(result.data); setDischargedPagination(nextPagination) }
      } else { message.error(result.message || 'Lỗi khi tải dữ liệu') }
    } catch (error) { console.error('Lỗi khi gọi API:', error); message.error('Lỗi kết nối server') }
  }, [currentUser?.userId, activePagination.current, activePagination.pageSize, dischargedPagination.current, dischargedPagination.pageSize, debouncedSearch, selectedUnitId, message])

  const loadUnitTree = useCallback(async () => {
    if (!currentUser?.userId) return
    try {
      setUnitTreeLoading(true)
      const response = await fetch(`/api/units?userId=${currentUser.userId}`)
      const result = await response.json()
      console.log(result)
      if (result.success && result.data) {
        const buildTree = (units: any[]): UnitTreeNode[] => {
          const unitMap = new Map<string, UnitTreeNode>()
          const rootNodes: UnitTreeNode[] = []
          units.forEach((unit: any) => { unitMap.set(unit.UnitID, { title: unit.UnitName, value: unit.UnitID, key: unit.UnitID, children: [], unitId: unit.UnitID }) })
          units.forEach((unit: any) => {
            const currentNode = unitMap.get(unit.UnitID); if (!currentNode) return
            if (unit.ParentUnitID) { const parentNode = unitMap.get(unit.ParentUnitID); if (parentNode) parentNode.children!.push(currentNode); else rootNodes.push(currentNode) }
            else rootNodes.push(currentNode)
          })
          return rootNodes
        }
        setUnitTreeData(buildTree(result.data))
      }
    } catch (error) { console.error('Lỗi khi tải cây đơn vị:', error) }
    finally { setUnitTreeLoading(false) }
  }, [currentUser?.userId])

  useEffect(() => { if (!isLoading && !currentUser) router.replace("/login") }, [currentUser, isLoading, router])
  useEffect(() => {
    setActivePagination((prev) => prev.current === 1 ? prev : { ...prev, current: 1 })
    setDischargedPagination((prev) => prev.current === 1 ? prev : { ...prev, current: 1 })
  }, [debouncedSearch, selectedUnitId])
  useEffect(() => { if (!isLoading && currentUser) void loadUnitTree() }, [currentUser, isLoading, loadUnitTree])

  // Load rank options for filter
  useEffect(() => {
    if (!isLoading && currentUser) {
      fetch('/api/dropdowns?userId=' + currentUser.userId + '&mode=RANK')
        .then(res => res.json())
        .then(result => {
          if (result.success && Array.isArray(result.data)) {
            setRankOptions(result.data.map((r: any) => ({ value: r.RankID, label: r.RankName })))
          }
        })
        .catch(err => console.error('Lỗi khi tải cấp bậc:', err))
    }
  }, [currentUser, isLoading])

  useEffect(() => {
    if (!isLoading && currentUser && activeTab !== "changelog") {
      setLoading(true)
      Promise.all([loadSoldiers('0'), loadSoldiers('1')]).finally(() => setLoading(false))
    }
  }, [activeTab, currentUser, isLoading, loadSoldiers])

  // ============================================================
  // COMPUTED DATA
  // ============================================================

  const activeCount = activePagination.total
  const dischargedCount = dischargedPagination.total
  const totalCount = activeCount + dischargedCount

  const currentData = useMemo(() => {
    let data: SoldierData[]
    if (activeTab === "discharged") data = dischargedData
    else data = activeData

    // Apply rank filter
    if (rankFilter) {
      data = data.filter(s => s.RankName === rankFilter || s.RankName?.toLowerCase().includes(rankFilter.toLowerCase()))
    }

    // Apply status filter
    if (statusFilter) {
      data = data.filter(s => s.StatusName === statusFilter || s.StatusName?.toLowerCase().includes(statusFilter.toLowerCase()))
    }

    return data
  }, [activeTab, activeData, dischargedData, rankFilter, statusFilter])

  const currentPagination = activeTab === "discharged" ? dischargedPagination : activePagination

  const filteredUnitTreeData = useMemo(() => {
    const searchText = debouncedTreeSearchText.trim()
    if (!searchText) return unitTreeData
    const searchLower = searchText.toLowerCase()
    const filterTree = (nodes: UnitTreeNode[]): UnitTreeNode[] => {
      const result: UnitTreeNode[] = []
      for (const node of nodes) {
        const titleMatch = node.title.toLowerCase().includes(searchLower)
        const filteredChildren = node.children ? filterTree(node.children) : []
        if (titleMatch || filteredChildren.length > 0) result.push({ ...node, children: titleMatch ? (node.children || []) : filteredChildren })
      }
      return result
    }
    return filterTree(unitTreeData)
  }, [unitTreeData, debouncedTreeSearchText])

  useEffect(() => {
    if (!debouncedTreeSearchText.trim()) { setExpandedUnitKeys([]); return }
    const collectKeys = (nodes: UnitTreeNode[]): string[] => {
      const keys: string[] = []; const traverse = (list: UnitTreeNode[]) => { for (const node of list) { keys.push(node.key); if (node.children?.length) traverse(node.children) } }
      traverse(nodes); return keys
    }
    setExpandedUnitKeys(collectKeys(filteredUnitTreeData))
  }, [filteredUnitTreeData, debouncedTreeSearchText])

  // ============================================================
  // GUARD
  // ============================================================

  if (isLoading || !currentUser) {
    return (
      <PageLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400 }}>
          <Typography.Text>Đang kiểm tra phiên đăng nhập...</Typography.Text>
        </div>
      </PageLayout>
    )
  }

  // ============================================================
  // HELPERS
  // ============================================================

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    try { const date = new Date(dateStr); return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}` }
    catch { return dateStr }
  }

  const handleDelete = (record: SoldierData) => {
    Modal.confirm({
      title: "Xác nhận xoá",
      content: (
        <div>
          <p style={{ color: "#ff4d4f", fontWeight: 600 }}>Bạn có chắc chắn muốn XOÁ chiến sĩ này?</p>
          <div style={{ background: "#fff1f0", padding: 12, borderRadius: 6, marginTop: 8, border: "1px solid #ffccc7" }}>
            <div><strong>{record.FullName}</strong></div>
            <div style={{ fontSize: 12, color: "#888" }}>{record.SoldierID} - {record.UnitName}</div>
          </div>
          <p style={{ marginTop: 12, color: "#ff4d4f", fontSize: 13 }}><ExclamationCircleFilled /> Hành động này KHÔNG THỂ HOÀN TÁC!</p>
        </div>
      ),
      okText: "Xoá", okType: "danger", cancelText: "Hủy",
      onOk: async () => {
        try {
          const response = await fetch(`/api/soldiers/${record.SoldierID}?userId=${currentUser.userId}&hard=true`, { method: 'DELETE' })
          const result = await response.json()
          if (result.success) { message.success("Đã xoá chiến sĩ"); void loadSoldiers('0') }
          else message.error(result.message || "Lỗi khi xoá")
        } catch { message.error('Lỗi kết nối server') }
      },
    })
  }

  const handleBellClick = () => setActiveTab("changelog")

  const handleImportExcel = () => router.push('/soldiers/import')
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const XLSX = await import("xlsx"); const bstr = evt.target?.result; const wb = XLSX.read(bstr, { type: "binary" })
        const ws = wb.Sheets[wb.SheetNames[0]]; const data = XLSX.utils.sheet_to_json(ws)
        message.success(`Đã import ${data.length} dòng`)
      } catch (error) { console.error("Lỗi khi đọc Excel:", error); message.error("Lỗi khi đọc file Excel") }
    }
    reader.readAsBinaryString(file); e.target.value = ""
  }

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams({ userId: currentUser.userId, mode: activeTab === "discharged" ? "1" : "0", export: "true" })
      if (search.trim()) params.set("search", search)
      if (selectedUnitId) params.set("unitId", selectedUnitId)
      const response = await fetch(`/api/soldiers?${params}`)
      const result = await response.json()
      if (!result.success) { message.error(result.message); return }
      const XLSX = await import("xlsx")
      const exportData = result.data.map((s: any) => ({
        "Mã quân nhân": s.SoldierID, "Họ và tên": s.FullName, "Ngày sinh": formatDate(s.DateOfBirth),
        "Đơn vị": s.UnitName, "Chức vụ": s.Position, "Cấp bậc": s.RankName, "Trạng thái": s.StatusName,
        "Ngày nhập ngũ": formatDate(s.EnlistmentDate),
      }))
      const ws = XLSX.utils.json_to_sheet(exportData); const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Danh sách"); XLSX.writeFile(wb, "DanhSachQuanNhan.xlsx")
      message.success("Xuất Excel thành công")
    } catch (err) { console.error(err); message.error("Xuất Excel thất bại") }
  }

  // ============================================================
  // TABLE COLUMNS (matching design)
  // ============================================================

  const columns: ColumnsType<SoldierData> = [
    {
      title: "", key: "checkbox", width: 40, align: "center",
      render: () => <input type="checkbox" style={{ width: 16, height: 16, cursor: "pointer" }} />,
    },
    {
      title: "Họ và tên", dataIndex: "FullName", key: "FullName", width: 200,
      render: (name: string, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar size={38} src={record.PhotoPath || undefined} style={{ background: "#4b5320", flexShrink: 0 }}>
            {record.FullName?.charAt(0)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#212121" }}>{name}</div>
          </div>
        </div>
      ),
    },
    { title: "Mã quân nhân", dataIndex: "SoldierID", key: "SoldierID", width: 90, render: (id: string) => <span style={{ color: "#666", fontSize: 13 }}>{id}</span> },
    {
      title: "Cấp bậc", dataIndex: "RankName", key: "RankName", width: 110,
      render: (rank: string) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 22, height: 22, borderRadius: 4, background: "linear-gradient(135deg, #3a5f3a, #2d4a2d)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#ffd700", fontSize: 10, fontWeight: 700 }}>★</span>
          </div>
          <span style={{ fontSize: 13 }}>{rank}</span>
        </div>
      ),
    },
    { title: "Chức vụ", dataIndex: "Position", key: "Position", width: 150, render: (v: string) => <span style={{ fontSize: 13 }}>{v}</span> },
    {
      title: "Đơn vị",
      key: "Unit",
      width: 400,
      render: (_, record) => {
        const units = (record.UnitFullPath || "")
          .split(",")
          .map((unit) => unit.trim())
          .filter(Boolean)

        if (units.length === 0) {
          return (
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {record.UnitName || "—"}
            </div>
          )
        }

        const currentUnit = units[units.length - 1]
        const parentUnits = units.slice(0, -1)

        return (
          <div style={{ lineHeight: 1.4 }}>
            {/* Các đơn vị cấp trên */}
            {parentUnits.length > 0 && (
              <div
                style={{
                  fontSize: 11,
                  color: "#8c8c8c",
                  marginBottom: 3,
                }}
              >
                {parentUnits.join(", ")}
              </div>
            )}

            {/* Đơn vị hiện tại */}
            <div
              style={{
                fontSize: 13,
                color: "#212121",
                fontWeight: 500,
              }}
            >
              {currentUnit}
            </div>
          </div>
        )
      },
    },
    {
      title: "Ngày nhập ngũ", dataIndex: "EnlistmentDate", key: "EnlistmentDate", width: 110, align: "center",
      render: (date: string) => <span style={{ fontSize: 13 }}>{formatDate(date)}</span>,
    },
    {
      title: "Tình trạng", dataIndex: "StatusName", key: "StatusName", width: 130, align: "center",
      render: (status: string) => <StatusTag status={status} />,
    },
    {
      title: "Thao tác", key: "actions", width: 80, align: "center", fixed: "right",
      render: (_, record) => (
        <Space size={4}>
          {hasPermission("canEdit") && (
            <Tooltip title="Sửa">
              <Button type="text" size="small" icon={<EditOutlined style={{ color: "#fb8c00" }} />} onClick={(e) => { e.stopPropagation(); handleEditSoldier(record) }} />
            </Tooltip>
          )}
          {hasPermission("canDelete") && (
            <Tooltip title="Xoá">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); handleDelete(record) }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <PageLayout onBellClick={handleBellClick}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <Typography.Title level={3} style={{ margin: 0, color: "#212121" }}>Danh sách quân nhân</Typography.Title>
        <Space>
          {hasPermission("canImport") && <Button icon={<UploadOutlined />} onClick={handleImportExcel}>Nhập Excel</Button>}
          {hasPermission("canExport") && <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>Xuất Excel</Button>}
          {activeTab !== "discharged" && hasPermission("canCreate") && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddSoldier} style={{ background: "#2e5c2e", borderColor: "#2e5c2e" }}>
              Thêm quân nhân
            </Button>
          )}
        </Space>
      </div>

      {/* Filter Bar */}
      <Card style={{ marginBottom: 16, borderRadius: 8 }} styles={{ body: { padding: "14px 16px" } }}>
        <Row gutter={[12, 12]} align="middle">
          <Col flex="auto">
            <Input
              placeholder="Tìm theo tên, CCCD, mã quân nhân..."
              prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ borderRadius: 8, maxWidth: 300 }}
              allowClear
            />
          </Col>
          <Col>
            <TreeSelect
              showSearch allowClear placeholder="Chọn đơn vị"
              value={selectedUnitId} onChange={(value) => setSelectedUnitId(value)}
              treeData={filteredUnitTreeData}
              searchValue={unitSearchText} onSearch={(value) => setUnitSearchText(value)}
              treeExpandedKeys={expandedUnitKeys} onTreeExpand={(keys) => setExpandedUnitKeys(keys as string[])}
              loading={unitTreeLoading} style={{ width: 350, borderRadius: 8 }}
              treeNodeFilterProp="title"
            />
          </Col>
          <Col>
            <Select
              showSearch
              allowClear
              placeholder="Cấp bậc"
              value={rankFilter}
              onChange={setRankFilter}
              options={rankOptions}
              style={{ width: 150 }}
              optionFilterProp="label"
            />
          </Col>
          <Col>
            <Select
              allowClear
              placeholder="Trạng thái"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
              options={[
                { value: "Đang tại ngũ", label: "Đang tại ngũ" },
                { value: "Xuất ngũ", label: "Xuất ngũ" },
                { value: "Điều chuyển", label: "Điều chuyển" },
                { value: "Nghỉ hưu", label: "Nghỉ hưu" },
              ]}
            />
          </Col>
          <Col>
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
                setSearch("")
                setSelectedUnitId(undefined)
                setRankFilter(undefined)
                setStatusFilter(undefined)
              }}
            >
              Xóa bộ lọc
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ marginRight: 24, fontSize: 14, color: '#666' }}>
          Tổng số chiến sĩ: <strong style={{ color: '#2e5c2e' }}>{totalCount}</strong>
        </div>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as typeof activeTab)}
          style={{ flex: 1 }}
          items={[
            { key: "active", label: `Đang công tác (${activeCount})` },
            { key: "discharged", label: `Đã xuất ngũ (${dischargedCount})` },
            // { key: "changelog", label: `Báo cáo chờ xử lý (${pendingCount})` },
            { key: "notification", label: `Gửi thông báo` },
          ]}
        />
      </div>

      {/* Table */}
      {activeTab !== "changelog" && activeTab !== "notification" && (
        <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 8 }}>
          <Table<SoldierData>
            rowKey="SoldierID"
            columns={columns}
            dataSource={currentData}
            loading={loading}
            scroll={{ x: 1200 }}
            onRow={(record) => ({
              onClick: () => router.push(`/soldiers/${record.SoldierID}`),
              style: { cursor: 'pointer' },
            })}
            pagination={{
              current: currentPagination.current,
              pageSize: currentPagination.pageSize,
              total: currentPagination.total,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: (total, range) => `Hiển thị ${range[0]} - ${range[1]} trong tổng số ${total} quân nhân`,
            }}
            onChange={(pagination) => {
              const next = { current: pagination.current || 1, pageSize: pagination.pageSize || currentPagination.pageSize, total: currentPagination.total }
              if (activeTab === "discharged") setDischargedPagination(next)
              else setActivePagination(next)
            }}
            locale={{ emptyText: "Không có dữ liệu" }}
            size="middle"
          />
        </Card>
      )}

      {activeTab === "changelog" && <ChangeReportTab />}
      {activeTab === "notification" && <SendNotificationTab />}

      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleFileChange} />

      <SoldierForm
        open={soldierFormOpen}
        onClose={() => { setSoldierFormOpen(false); setEditingSoldier(null) }}
        soldier={editingSoldier}
        onSuccess={handleFormSuccess}
      />
    </PageLayout>
  )
}
