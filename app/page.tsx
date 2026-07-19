/**
 * File: app/page.tsx
 * Mô tả: Trang chính - Dashboard quản lý hồ sơ quân nhân
 * Cập nhật: 2026-07-03
 * Thay đổi:
 *   - Thêm tìm kiếm theo HierarchyPath/FullPathName (filter trực tiếp)
 *   - TreeSelect tìm theo tên hiển thị cơ cấu đơn vị (filter theo UnitID)
 *   - Hiển thị cột đơn vị theo hierarchy (cấp trên nhỏ, hiện tại bình thường)
 *   - Cột Ngày sinh và Ngày nhập ngũ hiển thị đầy đủ dd/mm/yyyy
 *   - Tích hợp form Thêm/Sửa chiến sĩ
 *   - Permission check cho các nút Thêm/Sửa/Xoá/Xuất/Nhập
 */

"use client"

import { useMemo, useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { App, Avatar, Button, Card, Col, Input, Layout, Modal, Row, Space, Table, Tabs, Tooltip, Typography, TreeSelect } from "antd"
import type { ColumnsType } from "antd/es/table"
import { DeleteOutlined, EditOutlined, EyeOutlined, ExclamationCircleFilled, FileExcelOutlined, PlusOutlined, SearchOutlined, UploadOutlined, FolderOutlined, SendOutlined } from "@ant-design/icons"

import { AppHeader } from "@/components/app-header"
import { StatusTag } from "@/components/status-tag"
import { SoldierForm } from "@/components/soldier-form"
import { ChangeReportTab } from "@/components/change-report-tab"
import { useAuth } from "@/components/auth-provider"
import { useChangeLog } from "@/lib/change-log"

const { Content } = Layout

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
  UnitHierarchyPath?: string  // HierarchyPath của đơn vị chiến sĩ
  UnitFullPath: string        // FullPathName: "Quân khu 7,Sư đoàn Bộ binh 5,Phòng Tham mưu"
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

// TreeSelect dùng UnitID làm value (filter theo cơ cấu đơn vị)
interface UnitTreeNode {
  title: string
  value: string           // UnitID
  key: string             // UnitID
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
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function DashboardPage() {
  const router = useRouter()
  const { message } = App.useApp()
  const { user, isLoading, hasPermission } = useAuth()
  const { pendingCount } = useChangeLog()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State cho dữ liệu soldier
  const [activeData, setActiveData] = useState<SoldierData[]>([])
  const [dischargedData, setDischargedData] = useState<SoldierData[]>([])
  const [loading, setLoading] = useState(true)
  
  // Tìm kiếm theo tên, CCCD, mã chiến sĩ
  const [search, setSearch] = useState("")
  
  // Tìm kiếm theo HierarchyPath/FullPathName (filter trực tiếp trên danh sách)
  const [unitPathSearch, setUnitPathSearch] = useState("")
  
  // TreeSelect - chọn đơn vị từ cơ cấu (filter theo UnitID)
  const [selectedUnitId, setSelectedUnitId] = useState<string | undefined>(undefined)
  
  // State cho TreeSelect
  const [unitTreeData, setUnitTreeData] = useState<UnitTreeNode[]>([])
  const [unitTreeLoading, setUnitTreeLoading] = useState(false)
  const [unitSearchText, setUnitSearchText] = useState("")
  const [expandedUnitKeys, setExpandedUnitKeys] = useState<string[]>([])

  // Pagination server-side cho từng tab
  const [activePagination, setActivePagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [dischargedPagination, setDischargedPagination] = useState({ current: 1, pageSize: 20, total: 0 })

  // Debounce cho ô tìm kiếm chính và HierarchyPath/FullPathName
  const debouncedSearch = useDebounce(search, 400)
  const debouncedUnitPathSearch = useDebounce(unitPathSearch, 400)
  // Debounce cho TreeSelect search
  const debouncedTreeSearchText = useDebounce(unitSearchText, 400)

  // State cho tabs và form
  const [activeTab, setActiveTab] = useState<"active" | "discharged" | "changelog">("active")
  // State cho form Thêm/Sửa chiến sĩ
  const [soldierFormOpen, setSoldierFormOpen] = useState(false)
  const [editingSoldier, setEditingSoldier] = useState<SoldierData | null>(null)
  
  // Mở form Thêm mới
  const handleAddSoldier = () => {
    setEditingSoldier(null)
    setSoldierFormOpen(true)
  }
  
  // Mở form Sửa
  const handleEditSoldier = (soldier: SoldierData) => {
    setEditingSoldier(soldier)
    setSoldierFormOpen(true)
  }
  
  // Callback khi thêm/sửa thành công
  const handleFormSuccess = () => {
    const mode = activeTab === "discharged" ? '1' : '0'
    void loadSoldiers(mode)
  }

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
        userId: currentUser.userId,
        mode,
        page: String(page),
        pageSize: String(pageSize),
      })

      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      if (selectedUnitId) params.set('unitId', selectedUnitId)
      if (debouncedUnitPathSearch.trim()) params.set('unitPath', debouncedUnitPathSearch.trim())

      const response = await fetch(`/api/soldiers?${params.toString()}`)
      const result = await response.json()
      if (result.success) {
        const nextPagination = {
          current: result.page ?? page,
          pageSize: result.pageSize ?? pageSize,
          total: result.total ?? result.count ?? 0,
        }

        if (mode === '0') {
          setActiveData(result.data)
          setActivePagination(nextPagination)
        } else {
          setDischargedData(result.data)
          setDischargedPagination(nextPagination)
        }
      } else {
        message.error(result.message || 'Lỗi khi tải dữ liệu')
      }
    } catch (error) {
      console.error('Lỗi khi gọi API:', error)
      message.error('Lỗi kết nối server')
    }
  }, [
    currentUser?.userId,
    activePagination.current,
    activePagination.pageSize,
    dischargedPagination.current,
    dischargedPagination.pageSize,
    debouncedSearch,
    selectedUnitId,
    debouncedUnitPathSearch,
    message,
  ])

  // Load cây đơn vị - dùng UnitID làm value/key
  const loadUnitTree = useCallback(async () => {
    if (!currentUser?.userId) return
    try {
      setUnitTreeLoading(true)
      const response = await fetch(`/api/units?userId=${currentUser.userId}`)
      const result = await response.json()

      if (result.success && result.data) {
        const buildTree = (units: any[]): UnitTreeNode[] => {
          const unitMap = new Map<string, UnitTreeNode>()
          const rootNodes: UnitTreeNode[] = []

          // Tạo nodes - dùng UnitID làm key và value
          units.forEach((unit: any) => {
            unitMap.set(unit.UnitID, {
              title: unit.UnitName,
              value: unit.UnitID,
              key: unit.UnitID,
              children: [],
              unitId: unit.UnitID,
            })
          })

          // Xây dựng cây dựa vào ParentUnitID
          units.forEach((unit: any) => {
            const currentNode = unitMap.get(unit.UnitID)
            if (!currentNode) return

            if (unit.ParentUnitID) {
              const parentNode = unitMap.get(unit.ParentUnitID)
              if (parentNode) {
                parentNode.children!.push(currentNode)
              } else {
                rootNodes.push(currentNode)
              }
            } else {
              rootNodes.push(currentNode)
            }
          })

          return rootNodes
        }

        setUnitTreeData(buildTree(result.data))
      }
    } catch (error) {
      console.error('Lỗi khi tải cây đơn vị:', error)
    } finally {
      setUnitTreeLoading(false)
    }
  }, [currentUser?.userId])

  // Redirect nếu chưa đăng nhập
  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace("/login")
    }
  }, [currentUser, isLoading, router])

  // Reset về trang đầu khi đổi bộ lọc/tìm kiếm
  useEffect(() => {
    setActivePagination((prev) => prev.current === 1 ? prev : { ...prev, current: 1 })
    setDischargedPagination((prev) => prev.current === 1 ? prev : { ...prev, current: 1 })
  }, [debouncedSearch, selectedUnitId, debouncedUnitPathSearch])

  // Load cây đơn vị một lần sau khi đăng nhập
  useEffect(() => {
    if (!isLoading && currentUser) {
      void loadUnitTree()
    }
  }, [currentUser, isLoading, loadUnitTree])

  // Chỉ load tab hiện tại; search/pagination xử lý ở API
  useEffect(() => {
    if (!isLoading && currentUser && activeTab !== "changelog") {
      setLoading(true)
      const mode = activeTab === "discharged" ? '1' : '0'
      loadSoldiers(mode).finally(() => setLoading(false))
    }
  }, [activeTab, currentUser, isLoading, loadSoldiers])

  // ============================================================
  // DATA HIỂN THỊ - đã filter/search/pagination ở server
  // ============================================================

  const currentData = activeTab === "discharged" ? dischargedData : activeData
  const currentPagination = activeTab === "discharged" ? dischargedPagination : activePagination

  // ============================================================
  // TREE FILTER - Filter TreeSelect theo tên hiển thị
  // ============================================================

  const filteredUnitTreeData = useMemo(() => {
    const searchText = debouncedTreeSearchText.trim()
    if (!searchText) {
      return unitTreeData
    }

    const searchLower = searchText.toLowerCase()

    // Đệ quy filter tree: giữ lại node nếu title match HOẶC có con match
    const filterTree = (nodes: UnitTreeNode[]): UnitTreeNode[] => {
      const result: UnitTreeNode[] = []
      
      for (const node of nodes) {
        const titleMatch = node.title.toLowerCase().includes(searchLower)
        const filteredChildren = node.children ? filterTree(node.children) : []
        
        if (titleMatch || filteredChildren.length > 0) {
          result.push({
            ...node,
            children: titleMatch ? (node.children || []) : filteredChildren,
          })
        }
      }
      
      return result
    }

    return filterTree(unitTreeData)
  }, [unitTreeData, debouncedTreeSearchText])

  // Auto expand khi search trên TreeSelect
  useEffect(() => {
    if (!debouncedTreeSearchText.trim()) {
      setExpandedUnitKeys([])
      return
    }

    const collectKeys = (nodes: UnitTreeNode[]): string[] => {
      const keys: string[] = []
      const traverse = (list: UnitTreeNode[]) => {
        for (const node of list) {
          keys.push(node.key)
          if (node.children?.length) traverse(node.children)
        }
      }
      traverse(nodes)
      return keys
    }

    setExpandedUnitKeys(collectKeys(filteredUnitTreeData))
  }, [filteredUnitTreeData, debouncedTreeSearchText])

  // ============================================================
  // GUARD
  // ============================================================

  if (isLoading || !currentUser) {
    return (
      <Layout style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography.Text>Đang kiểm tra phiên đăng nhập...</Typography.Text>
      </Layout>
    )
  }

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    try {
      const date = new Date(dateStr)
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
    } catch {
      return dateStr
    }
  }

  const formatGender = (gender: number) => gender === 1 ? "Nam" : "Nữ"

  // Render cột đơn vị với hierarchy - cấp trên nhỏ, hiện tại bình thường
  const renderUnitHierarchy = (unitFullPath: string, unitName: string) => {
    if (!unitFullPath) return unitName || ""
    const parts = unitFullPath.split(',')
    if (parts.length <= 1) return <Typography.Text>{unitName || unitFullPath}</Typography.Text>

    const currentUnit = parts[parts.length - 1]
    const parentUnits = parts.slice(0, -1).join(', ')

    return (
      <div>
        {parentUnits && (
          <Typography.Text style={{ fontSize: 11, color: "#8c8c8c", display: 'block', lineHeight: 1.2 }}>
            {parentUnits}
          </Typography.Text>
        )}
        <Typography.Text style={{ fontWeight: 500, display: 'block', lineHeight: 1.3 }}>
          {currentUnit}
        </Typography.Text>
      </div>
    )
  }

  // XOÁ HẲN - Hard delete
  const handleDelete = (record: SoldierData) => {
    Modal.confirm({
      title: "Xác nhận xoá",
      content: (
        <div>
          <p style={{ color: "#ff4d4f", fontWeight: 600 }}>
            ⚠️ Bạn có chắc chắn muốn XOÁ chiến sĩ này khỏi hệ thống?
          </p>
          <div style={{ background: "#fff1f0", padding: 12, borderRadius: 6, marginTop: 8, border: "1px solid #ffccc7" }}>
            <div><strong>{record.FullName}</strong></div>
            <div style={{ fontSize: 12, color: "#888" }}>{record.SoldierID} - {record.UnitName}</div>
          </div>
          <p style={{ marginTop: 12, color: "#ff4d4f", fontSize: 13 }}>
            <ExclamationCircleFilled /> Hành động này KHÔNG THỂ HOÀN TÁC!
          </p>
        </div>
      ),
      okText: "Xoá",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          const response = await fetch(
            `/api/soldiers/${record.SoldierID}?userId=${currentUser.userId}&hard=true`,
            { method: 'DELETE' }
          )
          const result = await response.json()
          if (result.success) {
            message.success("Đã xoá chiến sĩ khỏi hệ thống")
            setLoading(true)
            const mode = activeTab === "discharged" ? '1' : '0'
            await loadSoldiers(mode)
            setLoading(false)
          } else {
            message.error(result.message || "Lỗi khi xoá")
          }
        } catch {
          message.error('Lỗi kết nối server')
        }
      },
    })
  }

  const handleBellClick = () => setActiveTab("changelog")

  // ============================================================
  // TABLE COLUMNS
  // Thứ tự: Ảnh, Họ tên, Ngày sinh, Cấp bậc, Chức vụ, Đơn vị, Ngày nhập ngũ, Giới tính, Dân tộc, Tôn giáo, Chuyên môn, Trạng thái, Thao tác
  // ============================================================

  const columns: ColumnsType<SoldierData> = [
    {
      title: "Ảnh",
      dataIndex: "PhotoPath",
      key: "PhotoPath",
      width: 60,
      align: "center",
      render: (photo: string, record) => (
        <Avatar size={36} src={photo} style={{ background: "#4b5320" }}>
          {record.FullName.charAt(0)}
        </Avatar>
      ),
    },
    {
      title: "Họ và tên",
      dataIndex: "FullName",
      key: "FullName",
      width: 160,
      render: (name: string, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 11, color: "#8c8c8c" }}>{record.SoldierID}</div>
        </div>
      ),
    },
    { 
      title: "Ngày sinh", 
      dataIndex: "DateOfBirth", 
      key: "DateOfBirth", 
      width: 100, 
      align: "center",
      render: (date: string) => {
        if (!date) return "—"
        try {
          const d = new Date(date)
          return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
        } catch {
          return date
        }
      }
    },
    { 
      title: "Cấp bậc", 
      dataIndex: "RankName", 
      key: "RankName", 
      width: 100 
    },
    { 
      title: "Chức vụ", 
      dataIndex: "Position", 
      key: "Position", 
      width: 130 
    },
    { 
      title: "Đơn vị", 
      key: "Unit", 
      width: 220, 
      render: (_, record) => renderUnitHierarchy(record.UnitFullPath, record.UnitName) 
    },
    { 
      title: "Ngày nhập ngũ", 
      dataIndex: "EnlistmentDate", 
      key: "EnlistmentDate", 
      width: 110, 
      align: "center",
      render: (date: string) => {
        if (!date) return "—"
        try {
          const d = new Date(date)
          return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
        } catch {
          return date
        }
      }
    },
    { 
      title: "Giới tính", 
      dataIndex: "Gender", 
      key: "Gender", 
      width: 70, 
      align: "center", 
      render: formatGender 
    },
    { 
      title: "Dân tộc", 
      dataIndex: "Ethnicity", 
      key: "Ethnicity", 
      width: 80 
    },
    { 
      title: "Tôn giáo", 
      dataIndex: "ReligionName", 
      key: "ReligionName", 
      width: 80 
    },
    { 
      title: "Chuyên môn", 
      dataIndex: "Specialization", 
      key: "Specialization", 
      width: 120 
    },
    { 
      title: "Trạng thái", 
      dataIndex: "StatusName", 
      key: "StatusName", 
      width: 100, 
      align: "center", 
      render: (status: string) => <StatusTag status={status} /> 
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 110,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => router.push(`/soldiers/${record.SoldierID}`)} />
          </Tooltip>
          {hasPermission("canEdit") && (
            <Tooltip title="Sửa">
              <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditSoldier(record)} />
            </Tooltip>
          )}
          {hasPermission("canDelete") && (
            <Tooltip title="Xoá">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  // ============================================================
  // EXCEL HANDLERS
  // ============================================================

  const handleImportExcel = () => fileInputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const XLSX = await import("xlsx")
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: "binary" })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws)
        message.success(`Đã import ${data.length} dòng`)
      } catch (error) {
        console.error("Lỗi khi đọc Excel:", error)
        message.error("Lỗi khi đọc file Excel")
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ""
  }

  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx")
      const exportData = currentData.map((s) => ({
        "Mã QS": s.SoldierID,
        "Họ và tên": s.FullName,
        "Giới tính": formatGender(s.Gender),
        "Ngày sinh": formatDate(s.DateOfBirth),
        "CCCD": s.CitizenID,
        "Đơn vị": s.UnitFullPath || s.UnitName,
        "Chức vụ": s.Position,
        "Cấp bậc": s.RankName,
        "Trạng thái": s.StatusName,
      }))
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "DanhSach")
      XLSX.writeFile(wb, `DanhSachQuanNhan_${activeTab}.xlsx`)
      message.success("Đã xuất file")
    } catch (error) {
      console.error("Lỗi khi xuất Excel:", error)
      message.error("Lỗi khi xuất file Excel")
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  const activeCount = activePagination.total
  const dischargedCount = dischargedPagination.total

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <AppHeader onBellClick={handleBellClick} />

      <Content style={{ padding: "24px 32px", background: "#f3f4ec" }}>
        {/* Thanh công cụ */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]} align="middle">
            {/* Tìm kiếm theo tên, CCCD, mã chiến sĩ */}
            <Col>
              <Input
                placeholder="Tìm theo tên, CCCD, mã chiến sĩ..."
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 240 }}
                allowClear
              />
            </Col>
            
            {/* TreeSelect - chọn đơn vị từ cơ cấu (filter theo UnitID) */}
            <Col>
              <TreeSelect
                showSearch
                allowClear
                placeholder="Chọn đơn vị..."
                value={selectedUnitId}
                onChange={(value) => setSelectedUnitId(value)}
                treeData={filteredUnitTreeData}
                searchValue={unitSearchText}
                onSearch={(value) => setUnitSearchText(value)}
                treeExpandedKeys={expandedUnitKeys}
                onTreeExpand={(keys) => setExpandedUnitKeys(keys as string[])}
                loading={unitTreeLoading}
                style={{ width: 280 }}
                treeNodeFilterProp="title"
                notFoundContent={unitTreeLoading ? "Đang tải..." : "Không có đơn vị"}
                styles={{ popup: { root: { maxHeight: 400, overflow: 'auto' } } }}
                listHeight={400}
              />
            </Col>
            
            {/* Tìm kiếm theo HierarchyPath/FullPathName (filter trực tiếp) */}
            <Col>
              <Input
                placeholder="Mã ĐH: QK7,fBB5,eBB4 hoặc tên: Quân khu 7,Sư đoàn..."
                prefix={<FolderOutlined style={{ color: "#8c8c8c" }} />}
                value={unitPathSearch}
                onChange={(e) => setUnitPathSearch(e.target.value)}
                style={{ width: 380 }}
                allowClear
              />
            </Col>
            
            <Col>
              {hasPermission("canImport") && (
                <Button icon={<UploadOutlined />} onClick={handleImportExcel}>Nhập Excel</Button>
              )}
            </Col>
            <Col>
              {hasPermission("canExport") && (
                <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>Xuất Excel</Button>
              )}
            </Col>
            <Col flex="auto" style={{ textAlign: "right" }}>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleFileChange} />
              {activeTab === "active" && hasPermission("canCreate") && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddSoldier}>Thêm chiến sĩ</Button>
              )}
            </Col>
          </Row>
        </Card>

        {/* Tabs */}
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as "active" | "discharged" | "changelog")}
          style={{ marginBottom: 16 }}
          items={[
            {
              key: "active",
              label: (
                <span>
                  <Avatar size="small" style={{ background: "#4b5320", marginRight: 8 }}><FolderOutlined /></Avatar>
                  Đang công tác ({activeCount})
                </span>
              ),
            },
            {
              key: "discharged",
              label: (
                <span>
                  <Avatar size="small" style={{ background: "#8c8c8c", marginRight: 8 }}><FolderOutlined /></Avatar>
                  Đã xuất ngũ ({dischargedCount})
                </span>
              ),
            },
            {
              key: "changelog",
              label: (
                <span>
                  <Avatar size="small" style={{ background: "#faad14", marginRight: 8 }}><SendOutlined /></Avatar>
                  Báo cáo thay đổi ({pendingCount})
                </span>
              ),
            },
          ]}
        />

        {/* Bảng dữ liệu */}
        {activeTab !== "changelog" && (
          <>
            <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
              <Typography.Text strong>
                {activeTab === "active" ? "Danh sách đang công tác" : "Danh sách đã xuất ngũ"}
              </Typography.Text>
              <Typography.Text type="secondary">Tổng: {currentPagination.total}</Typography.Text>
            </div>
            <Card styles={{ body: { padding: 0 } }}>
              <Table<SoldierData>
                rowKey="SoldierID"
                columns={columns}
                dataSource={currentData}
                loading={loading}
                scroll={{ x: 2100 }}
                pagination={{
                  current: currentPagination.current,
                  pageSize: currentPagination.pageSize,
                  total: currentPagination.total,
                  showSizeChanger: true,
                  pageSizeOptions: ['10', '20', '50', '100'],
                  showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
                }}
                onChange={(pagination) => {
                  const next = {
                    current: pagination.current || 1,
                    pageSize: pagination.pageSize || currentPagination.pageSize,
                    total: currentPagination.total,
                  }
                  if (activeTab === "discharged") {
                    setDischargedPagination(next)
                  } else {
                    setActivePagination(next)
                  }
                }}
                locale={{ emptyText: "Không có dữ liệu" }}
              />
            </Card>
          </>
        )}

        {activeTab === "changelog" && (
          <ChangeReportTab />
        )}
      </Content>

      {/* Form Thêm/Sửa chiến sĩ */}
      <SoldierForm
        open={soldierFormOpen}
        onClose={() => {
          setSoldierFormOpen(false)
          setEditingSoldier(null)
        }}
        soldier={editingSoldier}
        onSuccess={handleFormSuccess}
      />
    </Layout>
  )
}