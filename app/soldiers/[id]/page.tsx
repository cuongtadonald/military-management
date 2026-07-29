/**
 * File: app/soldiers/[id]/page.tsx
 * Mô tả: Trang chi tiết quân nhân - theo thiết kế mới
 */

"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { App, Avatar, Button, Card, Col, Descriptions, Divider, Empty, Layout, Modal, Row, Space, Spin, Table, Tabs, Tag, Tooltip, Typography } from "antd"
import type { ColumnsType } from "antd/es/table"
import {
  ArrowLeftOutlined, UserOutlined, HistoryOutlined, TeamOutlined, EditOutlined, DeleteOutlined,
  ExclamationCircleFilled, TrophyOutlined, SafetyCertificateOutlined, ReadOutlined,
  FileTextOutlined, PaperClipOutlined, ManOutlined,
} from "@ant-design/icons"

import { PageLayout } from "@/components/page-layout"
import { StatusTag } from "@/components/status-tag"
import { SoldierForm } from "@/components/soldier-form"
import { useAuth } from "@/components/auth-provider"

const { Content } = Layout

// ============================================================
// INTERFACES
// ============================================================

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
  Phone?: string
  Email?: string
}

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
  FromDate?: string
  ToDate?: string
  RankName?: string
  PartyPosition?: string
  WorkDescription?: string
  Description?: string
}

interface TrainingProcess {
  TrainingID: string
  SchoolName?: string
  MajorName?: string
  FromDate?: string
  ToDate?: string
  TrainingType?: string
  Certificate?: string
  Description?: string
}

interface SoldierHistory {
  HistoryID: string
  FieldName: string
  FieldDisplayName?: string
  OldValue?: string | null
  NewValue?: string | null
  ChangeType?: string
  ChangeDate?: string
  ChangedBy?: string
}

interface SoldierData {
  soldier: SoldierDetail
  family: FamilyMember[]
  workProcesses: WorkProcess[]
  trainingProcesses: TrainingProcess[]
  history: SoldierHistory[]
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
  const [soldierFormOpen, setSoldierFormOpen] = useState(false)

  const soldierId = params.id as string

  const handleFormSuccess = () => { if (user?.userId && soldierId) loadSoldier() }
  const handleEdit = () => setSoldierFormOpen(true)

  const handleDelete = () => {
    Modal.confirm({
      title: "Xác nhận xoá", icon: <ExclamationCircleFilled />,
      content: (<div><p>Bạn có chắc chắn muốn xoá <strong>{data?.soldier.FullName}</strong>?</p><p style={{ color: "#ff4d4f" }}>Hành động này không thể hoàn tác!</p></div>),
      okText: "Xoá", okType: "danger", cancelText: "Huỷ",
      onOk: async () => {
        try {
          const response = await fetch(`/api/soldiers/${soldierId}?userId=${user?.userId}&hard=true`, { method: 'DELETE' })
          const result = await response.json()
          if (result.success) { message.success("Đã xoá chiến sĩ"); router.push("/soldiers") }
          else message.error(result.message || "Lỗi khi xoá")
        } catch { message.error("Lỗi kết nối server") }
      },
    })
  }

  const loadSoldier = async () => {
    if (!user?.userId || !soldierId) return
    try {
      setLoading(true)
      const response = await fetch(`/api/soldiers/${soldierId}?userId=${user.userId}`)
      const result = await response.json()
      if (result.success) {
        const { family, workProcesses, trainingProcesses, history, ...soldier } = result.data
        setData({ soldier, family: family || [], workProcesses: workProcesses || [], trainingProcesses: trainingProcesses || [], history: history || [] })
      } else setError(result.message || "Không tìm thấy quân nhân")
    } catch (err) { console.error("Lỗi khi tải chi tiết:", err); setError("Lỗi kết nối server") }
    finally { setLoading(false) }
  }

  useEffect(() => { if (!authLoading && user) loadSoldier() }, [user, authLoading, soldierId])

  // ============================================================
  // LOADING & ERROR
  // ============================================================

  if (authLoading || !user) {
    return (<PageLayout><div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400 }}><Spin size="large" /><Typography.Text style={{ marginLeft: 12 }}>Đang kiểm tra phiên đăng nhập...</Typography.Text></div></PageLayout>)
  }
  if (loading) {
    return (<PageLayout><div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400 }}><Spin size="large" /><Typography.Text style={{ marginLeft: 12 }}>Đang tải thông tin chiến sĩ...</Typography.Text></div></PageLayout>)
  }
  if (error || !data) {
    return (
      <PageLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, height: 400 }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={error || "Không tìm thấy quân nhân"} />
          <Button type="primary" onClick={() => router.push("/soldiers")}>Quay về danh sách</Button>
        </div>
      </PageLayout>
    )
  }

  const { soldier, family, workProcesses, trainingProcesses, history } = data

  // ============================================================
  // HELPERS
  // ============================================================

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—"
    try { const d = new Date(dateStr); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` }
    catch { return dateStr }
  }

  const formatGender = (g: number) => g === 1 ? "Nam" : "Nữ"

  const calcSeniority = (enlistDate: string) => {
    if (!enlistDate) return "—"
    try {
      const start = new Date(enlistDate); const now = new Date()
      let years = now.getFullYear() - start.getFullYear()
      let months = now.getMonth() - start.getMonth()
      if (months < 0) { years--; months += 12 }
      return `${years} năm ${months} tháng`
    } catch { return "—" }
  }

  // ============================================================
  // TAB: THÔNG TIN CÁ NHÂN
  // ============================================================

  const personalTab = (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Top section: Photo + Basic Info (left) | Service Info (right) */}
      <Row gutter={24}>
        {/* Left: Photo + Basic Info */}
        <Col xs={24} lg={16}>
          <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
            <Avatar size={100} src={soldier.PhotoPath} icon={<UserOutlined />} style={{ background: "#4b5320", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <Descriptions column={1} size="small" labelStyle={{ width: 110, fontWeight: 500, color: "#666" }} contentStyle={{ fontSize: 14 }}>
                <Descriptions.Item label="Họ và tên"><Typography.Text strong style={{ fontSize: 15 }}>{soldier.FullName}</Typography.Text></Descriptions.Item>
                <Descriptions.Item label="Cấp bậc">
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 4, background: "linear-gradient(135deg, #3a5f3a, #2d4a2d)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#ffd700", fontSize: 10 }}>★</span>
                    </div>
                    <span>{soldier.RankName || "—"}</span>
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="Chức vụ">{soldier.Position || "—"}</Descriptions.Item>
                <Descriptions.Item label="Đơn vị">{soldier.UnitName || "—"}</Descriptions.Item>
                <Descriptions.Item label="Quê quán">{soldier.Hometown || "—"}</Descriptions.Item>
                <Descriptions.Item label="Thường trú">{[soldier.Address, soldier.CurrentWard, soldier.CurrentProvince].filter(Boolean).join(', ') || "—"}</Descriptions.Item>
              </Descriptions>
            </div>
          </div>

          {/* Personal details */}
          <div style={{ background: "#fafaf7", borderRadius: 8, padding: "16px 20px" }}>
            <Descriptions column={3} size="small" labelStyle={{ width: 100, fontWeight: 500, color: "#666", fontSize: 13 }} contentStyle={{ fontSize: 13 }}>
              <Descriptions.Item label="Ngày sinh">{formatDate(soldier.DateOfBirth)}</Descriptions.Item>
              <Descriptions.Item label="Giới tính">
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <ManOutlined style={{ color: "#2196f3" }} /> {formatGender(soldier.Gender)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Dân tộc">{soldier.Ethnicity || "Kinh"}</Descriptions.Item>
              <Descriptions.Item label="Tôn giáo">{soldier.ReligionName || "Không"}</Descriptions.Item>
              <Descriptions.Item label="Số CCCD">{soldier.CitizenID || "—"}</Descriptions.Item>
              <Descriptions.Item label="Ngày cấp">—</Descriptions.Item>
            </Descriptions>
          </div>
        </Col>

        {/* Right: Service Info */}
        <Col xs={24} lg={8}>
          <Card size="small" title={<span style={{ fontWeight: 600, fontSize: 14 }}>Thông tin phục vụ</span>} style={{ borderRadius: 8 }} styles={{ header: { background: "#f5f7f0", padding: "10px 16px" } }}>
            <Descriptions column={1} size="small" labelStyle={{ width: 140, fontWeight: 500, color: "#666", fontSize: 13 }} contentStyle={{ fontSize: 13 }}>
              <Descriptions.Item label="Ngày nhập ngũ">{formatDate(soldier.EnlistmentDate)}</Descriptions.Item>
              <Descriptions.Item label="Thâm niên quân ngũ">{calcSeniority(soldier.EnlistmentDate)}</Descriptions.Item>
              <Descriptions.Item label="Loại quân nhân">Sĩ quan</Descriptions.Item>
              <Descriptions.Item label="Hình thức phục vụ">Chuyên nghiệp</Descriptions.Item>
              <Descriptions.Item label="Tình trạng hôn nhân">{soldier.MaritalStatusName || "—"}</Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{soldier.Phone || "—"}</Descriptions.Item>
              <Descriptions.Item label="Email">{soldier.Email || "—"}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* 3 Cards: Trình độ, Khen thưởng, Kỷ luật */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card size="small" style={{ borderRadius: 8, height: "100%" }} styles={{ body: { padding: "14px 16px" } }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <ReadOutlined style={{ fontSize: 20, color: "#2e5c2e" }} />
              <Typography.Text strong style={{ fontSize: 14 }}>Trình độ chuyên môn</Typography.Text>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "Trình độ văn hóa", value: soldier.EducationLevel || "—" },
                { label: "Chuyên môn", value: soldier.Specialization || "—" },
                { label: "Lý luận chính trị", value: soldier.PoliticalLevel || "—" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#666" }}>{item.label}</span>
                  <span style={{ fontWeight: 500 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small" style={{ borderRadius: 8, height: "100%" }} styles={{ body: { padding: "14px 16px" } }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <TrophyOutlined style={{ fontSize: 20, color: "#d4a843" }} />
              <Typography.Text strong style={{ fontSize: 14 }}>Khen thưởng tiêu biểu</Typography.Text>
            </div>
            <div style={{ fontSize: 13, color: "#666" }}>
              <div style={{ marginBottom: 4 }}>• Huân chương Bảo vệ Tổ quốc</div>
              <div style={{ marginBottom: 4 }}>• Bằng khen Bộ Quốc phòng</div>
              <div style={{ marginBottom: 8 }}>• Chiến sĩ thi đua</div>
              <a style={{ color: "#2e5c2e", fontSize: 12 }}>Xem tất cả →</a>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small" style={{ borderRadius: 8, height: "100%" }} styles={{ body: { padding: "14px 16px" } }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <SafetyCertificateOutlined style={{ fontSize: 20, color: "#2e7d32" }} />
              <Typography.Text strong style={{ fontSize: 14 }}>Kỷ luật</Typography.Text>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#2e7d32", fontSize: 13 }}>
              <CheckCircleIcon />
              <span>Không có kỷ luật</span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Family section */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Typography.Text strong style={{ fontSize: 15 }}>Gia đình</Typography.Text>
        </div>
        <Table<FamilyMember>
          rowKey="FamilyID"
          size="small"
          pagination={false}
          dataSource={family}
          locale={{ emptyText: "Chưa có thông tin gia đình" }}
          columns={[
            { title: "Mối quan hệ", dataIndex: "Relationship", width: 120 },
            { title: "Họ và tên", dataIndex: "FullName", width: 180 },
            { title: "Ngày sinh", dataIndex: "DateOfBirth", width: 120, render: (v: string) => formatDate(v) },
            { title: "Nghề nghiệp", dataIndex: "Occupation", width: 150, render: (v: string) => v || "—" },
            { title: "Nơi công tác", dataIndex: "Workplace", width: 200, render: (v: string) => v || "—" },
          ]}
        />
      </div>
    </div>
  )

  // ============================================================
  // TAB: QUÁ TRÌNH CÔNG TÁC
  // ============================================================

  const workProcessTab = (
    <Table<WorkProcess>
      rowKey={(r, i) => r.WorkProcessID || `work-${i}`}
      columns={[
        { title: "Từ ngày", dataIndex: "FromDate", width: 120, render: (v) => formatDate(v || "") },
        { title: "Đến ngày", dataIndex: "ToDate", width: 120, render: (v) => v ? formatDate(v) : "Nay" },
        { title: "Cấp bậc", dataIndex: "RankName", width: 140, render: (v) => v || "—" },
        { title: "Chức vụ Đảng", dataIndex: "PartyPosition", width: 200, render: (v) => v || "—" },
        { title: "Chức vụ, đơn vị", dataIndex: "WorkDescription", width: 300, render: (v) => v || "—" },
        { title: "Ghi chú", dataIndex: "Description", width: 200, render: (v) => v || "—" },
      ]}
      dataSource={workProcesses}
      pagination={false}
      size="small"
      bordered
      scroll={{ x: 1080 }}
      locale={{ emptyText: "Chưa có quá trình công tác" }}
    />
  )

  // ============================================================
  // TAB: QUÁ TRÌNH ĐÀO TẠO
  // ============================================================

  const trainingProcessTab = (
    <Table<TrainingProcess>
      rowKey={(r, i) => r.TrainingID || `training-${i}`}
      columns={[
        { title: "Trường đào tạo", dataIndex: "SchoolName", width: 200, render: (v) => v || "—" },
        { title: "Ngành học", dataIndex: "MajorName", width: 200, render: (v) => v || "—" },
        { title: "Từ ngày", dataIndex: "FromDate", width: 120, render: (v) => formatDate(v || "") },
        { title: "Đến ngày", dataIndex: "ToDate", width: 120, render: (v) => v ? formatDate(v) : "Nay" },
        { title: "Hình thức", dataIndex: "TrainingType", width: 160, render: (v) => v || "—" },
        { title: "Bằng cấp", dataIndex: "Certificate", width: 200, render: (v) => v || "—" },
        { title: "Ghi chú", dataIndex: "Description", width: 180, render: (v) => v || "—" },
      ]}
      dataSource={trainingProcesses}
      pagination={false}
      size="small"
      bordered
      scroll={{ x: 1180 }}
      locale={{ emptyText: "Chưa có quá trình đào tạo" }}
    />
  )

  // ============================================================
  // TAB: GIA ĐÌNH
  // ============================================================

  const familyTab = (
    <div>
      <Table<FamilyMember>
        rowKey="FamilyID"
        columns={[
          { title: "Mối quan hệ", dataIndex: "Relationship", width: 120 },
          { title: "Họ và tên", dataIndex: "FullName", width: 180 },
          { title: "Ngày sinh", dataIndex: "DateOfBirth", width: 120, render: (v: string) => formatDate(v) },
          { title: "Nghề nghiệp", dataIndex: "Occupation", width: 150, render: (v: string) => v || "—" },
          { title: "Nơi công tác", dataIndex: "Workplace", width: 220, render: (v: string) => v || "—" },
          { title: "SĐT", dataIndex: "PhoneNumber", width: 120, render: (v: string) => v || "—" },
          { title: "Địa chỉ", dataIndex: "Address", width: 200, render: (v: string) => v || "—" },
        ]}
        dataSource={family}
        pagination={false}
        size="small"
        bordered
        scroll={{ x: 1110 }}
        locale={{ emptyText: "Chưa có thông tin thân nhân" }}
      />
    </div>
  )

  // ============================================================
  // TAB: KHEN THƯỞNG - KỶ LUẬT
  // ============================================================

  const awardDisciplineTab = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card size="small" title={<span><TrophyOutlined style={{ color: "#d4a843", marginRight: 8 }} />Khen thưởng</span>}>
        <Empty description="Chưa có dữ liệu khen thưởng" />
      </Card>
      <Card size="small" title={<span><SafetyCertificateOutlined style={{ color: "#2e7d32", marginRight: 8 }} />Kỷ luật</span>}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#2e7d32" }}>
          <CheckCircleIcon />
          <span>Không có kỷ luật</span>
        </div>
      </Card>
    </div>
  )

  // ============================================================
  // TAB: TÀI LIỆU ĐÍNH KÈM
  // ============================================================

  const documentsTab = (
    <div>
      <Empty description="Chưa có tài liệu đính kèm" />
    </div>
  )

  // ============================================================
  // TAB: LỊCH SỬ
  // ============================================================

  const historyTab = (
    <Table<SoldierHistory>
      rowKey={(r, i) => r.HistoryID || `history-${i}`}
      columns={[
        { title: "Thời gian", dataIndex: "ChangeDate", width: 170, render: (v) => v ? new Date(v).toLocaleString("vi-VN") : "—" },
        { title: "Trường thay đổi", dataIndex: "FieldDisplayName", width: 180, render: (v: string, r) => v || r.FieldName || "—" },
        { title: "Giá trị cũ", dataIndex: "OldValue", width: 220, render: (v) => v || "—" },
        { title: "Giá trị mới", dataIndex: "NewValue", width: 220, render: (v) => v || "—" },
        { title: "Người thay đổi", dataIndex: "ChangedBy", width: 180, render: (v) => v || "—" },
      ]}
      dataSource={history}
      pagination={{ pageSize: 10, showTotal: (total) => `Tổng ${total} lịch sử` }}
      size="small"
      bordered
      scroll={{ x: 970 }}
      locale={{ emptyText: "Chưa có lịch sử thay đổi" }}
    />
  )

  // ============================================================
  // TAB ITEMS
  // ============================================================

  const tabItems = [
    { key: "personal", label: <span><UserOutlined /> Thông tin cá nhân</span>, children: personalTab },
    { key: "work", label: <span><HistoryOutlined /> Quá trình công tác</span>, children: workProcessTab },
    { key: "training", label: <span><ReadOutlined /> Quá trình đào tạo</span>, children: trainingProcessTab },
    { key: "family", label: <span><TeamOutlined /> Gia đình</span>, children: familyTab },
    { key: "awards", label: <span><TrophyOutlined /> Khen thưởng – Kỷ luật</span>, children: awardDisciplineTab },
    { key: "documents", label: <span><PaperClipOutlined /> Tài liệu đính kèm</span>, children: documentsTab },
    { key: "history", label: <span><HistoryOutlined /> Lịch sử</span>, children: historyTab },
  ]

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <PageLayout>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/soldiers")} style={{ borderRadius: 6 }}>
            Quay lại
          </Button>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Typography.Title level={4} style={{ margin: 0 }}>{soldier.FullName}</Typography.Title>
              <StatusTag status={soldier.StatusName} />
            </div>
            <div style={{ color: "#666", fontSize: 13, marginTop: 2 }}>
              {soldier.SoldierID} • {soldier.RankName} • {soldier.Position}
            </div>
          </div>
          <Space>
            {hasPermission("canEdit") && (
              <Tooltip title="Sửa thông tin">
                <Button icon={<EditOutlined />} onClick={handleEdit}>Sửa thông tin</Button>
              </Tooltip>
            )}
            {hasPermission("canDelete") && (
              <Tooltip title="Xoá hồ sơ">
                <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>Xoá hồ sơ</Button>
              </Tooltip>
            )}
          </Space>
        </div>

        {/* Tabs */}
        <Card style={{ borderRadius: 8 }}>
          <Tabs items={tabItems} defaultActiveKey="personal" />
        </Card>
      </div>
    </PageLayout>
  )
}

// Helper component for check circle icon
function CheckCircleIcon() {
  return (
    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  )
}
