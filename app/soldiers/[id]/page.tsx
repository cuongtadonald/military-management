/**
 * File: app/soldiers/[id]/page.tsx
 * Mô tả: Trang chi tiết quân nhân - gọi API W01P0003
 * Cập nhật: 2026-07-03
 * 
 * Cấu trúc:
 *   - Tab 1: Thông tin cá nhân (bao gồm quân sự + sức khỏe)
 *   - Tab 2: Thân nhân
 *   - Tab 3: Lịch sử (placeholder)
 *   - Bottom: Tên user tạo (không phải ID)
 *   - Trạng thái hiển thị kế bên tên chiến sĩ
 *   - Nút Sửa/Xoá ở góc trên bên phải
 */

"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { App, Button, Card, Descriptions, Layout, Spin, Tag, Typography, Tabs, Empty, Row, Col, Avatar, Divider, Modal, Space, Tooltip, Table } from "antd"
import type { ColumnsType } from "antd/es/table"
import { ArrowLeftOutlined, UserOutlined, HistoryOutlined, TeamOutlined, EditOutlined, DeleteOutlined, ExclamationCircleFilled } from "@ant-design/icons"

import { AppHeader } from "@/components/app-header"
import { StatusTag } from "@/components/status-tag"
import { SoldierForm } from "@/components/soldier-form"
import { useAuth } from "@/components/auth-provider"

const { Content } = Layout

// ============================================================
// INTERFACES
// ============================================================

// Interface theo W01P0003 Mode 0
interface SoldierDetail {
  SoldierID: string
  FullName: string
  DateOfBirth: string
  Gender: number
  CitizenID: string
  UnitID: string
  UnitName: string
  UnitFullPath: string
  UnitShortName: string
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
  CurrentWard: string
  CurrentProvince: string
  EnlistmentDate: string
  PartyJoinDate: string
  YouthUnionJoinDate: string
  PhotoPath: string
  FileID: string
  CreatedDate: string
  CreatedBy: string
  LastModifiedDate: string
  LastModifiedBy: string
}

// Interface theo W01P0003 Mode 1 - Thân nhân
interface FamilyMember {
  FamilyID: string
  FullName: string
  Relationship: string
  DateOfBirth: string
  Occupation: string
  Workplace: string
  PhoneNumber: string
  Address: string
  IsDependent: boolean
}

interface WorkProcess {
  WorkProcessID: string
  SoldierID?: string
  FromDate?: string
  ToDate?: string
  WorkDescription?: string
  RankID?: string
  RankName?: string
  PartyPosition?: string
  Description?: string
}

interface TrainingProcess {
  TrainingID: string
  SoldierID?: string
  SchoolName?: string
  MajorName?: string
  FromDate?: string
  ToDate?: string
  TrainingType?: string
  Certificate?: string
  Description?: string
}

// Interface cho User info
interface UserInfo {
  userId: string
  fullName: string
  username: string
  roleName: string
}

interface SoldierData {
  soldier: SoldierDetail
  family: FamilyMember[]
  workProcesses: WorkProcess[]
  trainingProcesses: TrainingProcess[]
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function SoldierDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { message } = App.useApp()
  const { user, isLoading: authLoading, hasPermission } = useAuth()

  const [data, setData] = useState<SoldierData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map())

  // State cho form Sửa
  const [soldierFormOpen, setSoldierFormOpen] = useState(false)

  const soldierId = params.id as string

  // Callback khi sửa thành công
  const handleFormSuccess = () => {
    // Reload data
    if (user?.userId && soldierId) {
      loadSoldier()
    }
  }

  // Mở form Sửa
  const handleEdit = () => {
    setSoldierFormOpen(true)
  }

  // Xử lý Xoá
  const handleDelete = () => {
    Modal.confirm({
      title: "Xác nhận xoá",
      icon: <ExclamationCircleFilled />,
      content: (
        <div>
          <p>Bạn có chắc chắn muốn xoá chiến sĩ <strong>{data?.soldier.FullName}</strong>?</p>
          <p style={{ color: "#ff4d4f" }}>Hành động này không thể hoàn tác!</p>
        </div>
      ),
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: async () => {
        try {
          const response = await fetch(`/api/soldiers/${soldierId}?userId=${user?.userId}&hard=true`, {
            method: 'DELETE',
          })
          const result = await response.json()
          
          if (result.success) {
            message.success("Đã xoá chiến sĩ")
            router.push("/")
          } else {
            message.error(result.message || "Lỗi khi xoá")
          }
        } catch (error) {
          console.error("Lỗi khi xoá:", error)
          message.error("Lỗi kết nối server")
        }
      },
    })
  }

  // Load chi tiết quân nhân
  const loadSoldier = async () => {
    if (!user?.userId || !soldierId) return

    try {
      setLoading(true)
      const response = await fetch(
        `/api/soldiers/${soldierId}?userId=${user.userId}`
      )
      const result = await response.json()

      if (result.success) {
        const { family, workProcesses, trainingProcesses, ...soldier } = result.data
        setData({
          soldier,
          family: family || [],
          workProcesses: workProcesses || [],
          trainingProcesses: trainingProcesses || [],
        })

        // Load thông tin user tạo (nếu có)
        const createdBy = soldier.CreatedBy
        const lastModifiedBy = soldier.LastModifiedBy
        
        if (createdBy || lastModifiedBy) {
          const userIds = [createdBy, lastModifiedBy].filter(Boolean) as string[]
          await loadUserInfo(userIds)
        }
      } else {
        setError(result.message || "Không tìm thấy quân nhân")
      }
    } catch (err) {
      console.error("Lỗi khi tải chi tiết:", err)
      setError("Lỗi kết nối server")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      loadSoldier()
    }
  }, [user, authLoading, soldierId])

  // Load thông tin user từ API
  const loadUserInfo = async (userIds: string[]) => {
    try {
      // Gọi API để lấy thông tin user
      // Tạm thời dùng map từ userId -> fullName
      // Về sau có thể gọi API /api/users để lấy thông tin
      const mockUserMap = new Map<string, string>()
      
      // Mock data - về sau thay bằng API call
      mockUserMap.set('U001', 'Quản trị hệ thống')
      mockUserMap.set('U002', 'Chỉ huy Sư đoàn 5')
      mockUserMap.set('U003', 'Quản lý Trung đoàn 4')
      mockUserMap.set('U004', 'Quản lý Tiểu đoàn 14')
      mockUserMap.set('U005', 'Cán bộ nhân sự')
      
      setUserMap(mockUserMap)
    } catch (error) {
      console.error('Lỗi khi tải thông tin user:', error)
    }
  }

  // ============================================================
  // LOADING & ERROR STATES
  // ============================================================

  if (authLoading || !user) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <AppHeader />
        <Content style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Spin size="large" />
          <Typography.Text style={{ marginLeft: 12 }}>Đang kiểm tra phiên đăng nhập...</Typography.Text>
        </Content>
      </Layout>
    )
  }

  if (loading) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <AppHeader />
        <Content style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Spin size="large" />
          <Typography.Text style={{ marginLeft: 12 }}>Đang tải thông tin chiến sĩ...</Typography.Text>
        </Content>
      </Layout>
    )
  }

  if (error || !data) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <AppHeader />
        <Content style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={error || "Không tìm thấy quân nhân"}
          />
          <Button type="primary" onClick={() => router.push("/")}>
            Quay về trang chủ
          </Button>
        </Content>
      </Layout>
    )
  }

  const { soldier, family, workProcesses, trainingProcesses } = data

  // ============================================================
  // HELPER FUNCTIONS
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

  // Lấy tên user từ ID
  const getUserName = (userId: string | undefined) => {
    if (!userId) return "—"
    return userMap.get(userId) || userId
  }

  // ============================================================
  // STYLE CHO DESCRIPTIONS
  // ============================================================

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: "#4b5320",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: "2px solid #4b5320",
  }

  // Style cho Descriptions (dùng styles thay vì labelStyle deprecated)
  const descriptionStyles = {
    label: {
      fontWeight: 500,
      backgroundColor: "#fafafa",
      width: "140px",
    },
  }

  const descriptionStyles3Col = {
    label: {
      fontWeight: 500,
      backgroundColor: "#fafafa",
      width: "120px",
    },
  }

  const familyDescriptionStyles = {
    label: {
      width: "100px",
      backgroundColor: "#fafafa",
    },
  }

  const workProcessColumns: ColumnsType<WorkProcess> = [
    { title: "Từ ngày", dataIndex: "FromDate", width: 120, render: (value) => value || "—" },
    { title: "Đến ngày", dataIndex: "ToDate", width: 120, render: (value) => value || "—" },
    { title: "Cấp bậc", dataIndex: "RankID", width: 140, render: (value, record) => record.RankName || value || "—" },
    { title: "Chức vụ Đảng, đoàn thể", dataIndex: "PartyPosition", width: 220, render: (value) => value || "—" },
    { title: "Chức vụ, đơn vị, binh chủng, chiến trường", dataIndex: "WorkDescription", width: 320, render: (value) => value || "—" },
    { title: "Ghi chú", dataIndex: "Description", width: 220, render: (value) => value || "—" },
  ]

  const trainingProcessColumns: ColumnsType<TrainingProcess> = [
    { title: "Tên trường đào tạo", dataIndex: "SchoolName", width: 220, render: (value) => value || "—" },
    { title: "Ngành học/lớp học", dataIndex: "MajorName", width: 220, render: (value) => value || "—" },
    { title: "Từ ngày", dataIndex: "FromDate", width: 120, render: (value) => value || "—" },
    { title: "Đến ngày", dataIndex: "ToDate", width: 120, render: (value) => value || "—" },
    { title: "Hình thức đào tạo", dataIndex: "TrainingType", width: 180, render: (value) => value || "—" },
    { title: "Bằng cấp, chứng chỉ", dataIndex: "Certificate", width: 220, render: (value) => value || "—" },
    { title: "Ghi chú", dataIndex: "Description", width: 220, render: (value) => value || "—" },
  ]

  // ============================================================
  // TAB ITEMS
  // ============================================================

  const tabItems = [
    {
      key: "personal",
      label: (
        <span>
          <UserOutlined /> Thông tin cá nhân
        </span>
      ),
      children: (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* ===== SECTION 1: THÔNG TIN CƠ BẢN ===== */}
          <div>
            <div style={sectionTitleStyle}>Thông tin cơ bản</div>
            <Descriptions bordered column={2} size="small" styles={descriptionStyles}>
              <Descriptions.Item label="Họ và tên" span={2}>
                <Typography.Text strong style={{ fontSize: 15 }}>{soldier.FullName}</Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="Cấp bậc">
                <Tag color="blue" style={{ fontSize: 13, padding: "2px 12px" }}>{soldier.RankName || "—"}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Chức vụ">
                <Typography.Text style={{ fontSize: 13 }}>{soldier.Position || "—"}</Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="Đơn vị" span={2}>
                {renderUnitHierarchy(soldier.UnitFullPath, soldier.UnitName)}
              </Descriptions.Item>
              <Descriptions.Item label="Quê quán" span={2}>
                {soldier.Hometown || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Thường trú" span={2}>
                {[soldier.Address, soldier.CurrentWard, soldier.CurrentProvince].filter(Boolean).join(', ') || "—"}
              </Descriptions.Item>
            </Descriptions>
          </div>

          {/* ===== SECTION 2: THÔNG TIN CÁ NHÂN ===== */}
          <div>
            <div style={sectionTitleStyle}>Thông tin cá nhân</div>
            <Descriptions bordered column={3} size="small" styles={descriptionStyles3Col}>
              <Descriptions.Item label="Dân tộc">{soldier.Ethnicity || "Kinh"}</Descriptions.Item>
              <Descriptions.Item label="Tôn giáo">{soldier.ReligionName || "Không"}</Descriptions.Item>
              <Descriptions.Item label="Tình trạng hôn nhân">{soldier.MaritalStatusName || "—"}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">{formatDate(soldier.DateOfBirth)}</Descriptions.Item>
              <Descriptions.Item label="CCCD">{soldier.CitizenID || "—"}</Descriptions.Item>
              <Descriptions.Item label="Giới tính">{formatGender(soldier.Gender)}</Descriptions.Item>
            </Descriptions>
          </div>

          {/* ===== SECTION 3: QUÂN SỰ ===== */}
          <div>
            <div style={sectionTitleStyle}>Thông tin quân sự</div>
            <Descriptions bordered column={3} size="small" styles={descriptionStyles3Col}>
              <Descriptions.Item label="Ngày nhập ngũ">{formatDate(soldier.EnlistmentDate)}</Descriptions.Item>
              <Descriptions.Item label="Trình độ văn hoá">{soldier.EducationLevel || "—"}</Descriptions.Item>
              <Descriptions.Item label="Chuyên môn">{soldier.Specialization || "—"}</Descriptions.Item>
              <Descriptions.Item label="Ngày vào Đoàn">{formatDate(soldier.YouthUnionJoinDate)}</Descriptions.Item>
              <Descriptions.Item label="Ngày vào Đảng">{formatDate(soldier.PartyJoinDate)}</Descriptions.Item>
              <Descriptions.Item label="Trình độ chính trị">{soldier.PoliticalLevel || "—"}</Descriptions.Item>
            </Descriptions>
          </div>

          {/* ===== SECTION 4: SỨC KHỎE ===== */}
          <div>
            <div style={sectionTitleStyle}>Sức khỏe</div>
            <Descriptions bordered column={3} size="small" styles={descriptionStyles3Col}>
              <Descriptions.Item label="Chiều cao">{soldier.Height ? `${soldier.Height} cm` : "—"}</Descriptions.Item>
              <Descriptions.Item label="Cân nặng">{soldier.Weight ? `${soldier.Weight} kg` : "—"}</Descriptions.Item>
              <Descriptions.Item label="Nhóm máu">{soldier.BloodType || "—"}</Descriptions.Item>
              <Descriptions.Item label="Huyết áp">{soldier.BloodPressure || "—"}</Descriptions.Item>
              <Descriptions.Item label="Phân loại sức khỏe" span={2}>
                {soldier.HealthClassification ? (
                  <Tag color={soldier.HealthClassification.includes('1') ? 'green' : 'orange'} style={{ fontSize: 13, padding: "2px 12px" }}>
                    {soldier.HealthClassification}
                  </Tag>
                ) : "—"}
              </Descriptions.Item>
            </Descriptions>
          </div>

          {/* ===== SECTION 5: QUÁ TRÌNH CÔNG TÁC ===== */}
          <div>
            <div style={sectionTitleStyle}>Quá trình công tác</div>
            <Table<WorkProcess>
              rowKey={(record, index) => record.WorkProcessID || `work-${index}`}
              columns={workProcessColumns}
              dataSource={workProcesses}
              pagination={false}
              size="small"
              bordered
              scroll={{ x: 1220 }}
              locale={{ emptyText: "Chưa có quá trình công tác" }}
            />
          </div>

          {/* ===== SECTION 6: QUÁ TRÌNH ĐÀO TẠO ===== */}
          <div>
            <div style={sectionTitleStyle}>Quá trình đào tạo</div>
            <Table<TrainingProcess>
              rowKey={(record, index) => record.TrainingID || `training-${index}`}
              columns={trainingProcessColumns}
              dataSource={trainingProcesses}
              pagination={false}
              size="small"
              bordered
              scroll={{ x: 1300 }}
              locale={{ emptyText: "Chưa có quá trình đào tạo" }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "family",
      label: (
        <span>
          <TeamOutlined /> Thân nhân ({family?.length || 0})
        </span>
      ),
      children: family && family.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {family.map((member, index) => (
            <Card 
              key={member.FamilyID} 
              size="small"
              title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Tag color="blue" style={{ fontSize: 12 }}>{member.Relationship}</Tag>
                  <Typography.Text strong>{member.FullName}</Typography.Text>
                  {member.IsDependent && (
                    <Tag color="green" style={{ fontSize: 11 }}>Phụ thuộc</Tag>
                  )}
                </div>
              }
              styles={{ header: { background: "#fafafa", padding: "8px 16px" } }}
            >
              <Descriptions bordered column={3} size="small" styles={familyDescriptionStyles}>
                <Descriptions.Item label="Ngày sinh">{formatDate(member.DateOfBirth)}</Descriptions.Item>
                <Descriptions.Item label="Nghề nghiệp">{member.Occupation || "—"}</Descriptions.Item>
                <Descriptions.Item label="SĐT">{member.PhoneNumber || "—"}</Descriptions.Item>
                <Descriptions.Item label="Nơi làm việc" span={2}>{member.Workplace || "—"}</Descriptions.Item>
                <Descriptions.Item label="Là phụ thuộc">
                  <Tag color={member.IsDependent ? "green" : "default"}>
                    {member.IsDependent ? "Có" : "Không"}
                  </Tag>
                </Descriptions.Item>
                {member.Address && (
                  <Descriptions.Item label="Địa chỉ" span={3}>{member.Address}</Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          ))}
        </div>
      ) : (
        <Empty description="Chưa có thông tin thân nhân" />
      ),
    },
    {
      key: "history",
      label: (
        <span>
          <HistoryOutlined /> Lịch sử
        </span>
      ),
      children: (
        <Empty description="Chức năng đang phát triển" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ),
    },
  ]

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <AppHeader />

      <Content style={{ padding: "20px 32px", background: "#f3f4ec" }}>
        {/* Header - Thông tin cơ bản */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push("/")}
            >
              Quay lại
            </Button>

            <Avatar
              size={56}
              src={soldier.PhotoPath}
              icon={<UserOutlined />}
              style={{ background: "#4b5320" }}
            />

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {soldier.FullName}
                </Typography.Title>
                <StatusTag status={soldier.StatusName} />
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 4, color: "#666", fontSize: 13 }}>
                <span>{soldier.SoldierID}</span>
                <span>•</span>
                <span>{soldier.RankName}</span>
                <span>•</span>
                <span>{soldier.Position}</span>
              </div>
            </div>

            {/* Nút Sửa và Xoá ở góc trên bên phải */}
            <Space>
              {hasPermission("canEdit") && (
                <Tooltip title="Sửa thông tin">
                  <Button
                    icon={<EditOutlined />}
                    onClick={handleEdit}
                  >
                    Sửa
                  </Button>
                </Tooltip>
              )}
              {hasPermission("canDelete") && (
                <Tooltip title="Xoá chiến sĩ">
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleDelete}
                  >
                    Xoá
                  </Button>
                </Tooltip>
              )}
            </Space>
          </div>
        </Card>

        {/* Tabs */}
        <Card>
          <Tabs items={tabItems} defaultActiveKey="personal" />
        </Card>

        {/* Audit info - Hiển thị tên user thay vì ID */}
        <Card size="small" style={{ marginTop: 12 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Tạo bởi: <strong>{getUserName(soldier.CreatedBy)}</strong> | Ngày tạo: {formatDate(soldier.CreatedDate)}
            {soldier.LastModifiedBy && (
              <> | Sửa bởi: <strong>{getUserName(soldier.LastModifiedBy)}</strong> | Ngày sửa: {formatDate(soldier.LastModifiedDate)}</>
            )}
          </Typography.Text>
        </Card>
      </Content>

      {/* Form Sửa chiến sĩ */}
      <SoldierForm
        open={soldierFormOpen}
        onClose={() => setSoldierFormOpen(false)}
        soldier={data ? {
          ...data.soldier,
          workProcesses: data.workProcesses,
          trainingProcesses: data.trainingProcesses,
        } : null}
        onSuccess={handleFormSuccess}
      />
    </Layout>
  )
}