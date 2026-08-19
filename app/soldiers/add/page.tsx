/**
 * File: app/soldiers/add/page.tsx
 * Mô tả: Trang Thêm quân nhân - Wizard 5 bước (Cập nhật theo soldier-form.tsx)
 * Bước 1: Thông tin cơ bản + Ảnh
 * Bước 2: Thân nhân
 * Bước 3: Quá trình công tác + đào tạo
 * Bước 4: Xác nhận thông tin
 * Bước 5: Hoàn tất
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { App, Button, Form, Input, InputNumber, Select, DatePicker, Upload, Steps, Typography, Alert, Card, Row, Col, Divider, Space, Tag, Switch } from "antd"
import {
  UserOutlined,
  TeamOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  UploadOutlined,
} from "@ant-design/icons"
import { PageLayout } from "@/components/page-layout"
import { useAuth } from "@/components/auth-provider"
import dayjs from "dayjs"

const { Title, Text } = Typography
const { Option } = Select

// ============================================================
// STATIC OPTIONS (Theo soldier-form.tsx)
// ============================================================

const STATUS_OPTIONS = [
  { value: "ST001", label: "Đang tại ngũ" },
  { value: "ST002", label: "Điều chuyển" },
  { value: "ST003", label: "Nghỉ hưu" },
  { value: "ST004", label: "Xuất ngũ" },
]

const ETHNICITY_OPTIONS = [
  { value: "Kinh", label: "Kinh" },
  { value: "Tày", label: "Tày" },
  { value: "Thái", label: "Thái" },
  { value: "Mường", label: "Mường" },
  { value: "Khmer", label: "Khmer" },
  { value: "Nùng", label: "Nùng" },
  { value: "Hmông", label: "Hmông" },
  { value: "Dao", label: "Dao" },
  { value: "Khác", label: "Khác" },
]

const EDUCATION_OPTIONS = [
  { value: "9/12", label: "9/12" },
  { value: "10/12", label: "10/12" },
  { value: "11/12", label: "11/12" },
  { value: "12/12", label: "12/12" },
  // { value: "Cao đẳng", label: "Cao đẳng" },
  // { value: "Đại học", label: "Đại học" },
  // { value: "Thạc sĩ", label: "Thạc sĩ" },
  // { value: "Tiến sĩ", label: "Tiến sĩ" },
]

const POLITICAL_LEVEL_OPTIONS = [
  { value: "Sơ cấp", label: "Sơ cấp" },
  { value: "Trung cấp", label: "Trung cấp" },
  { value: "Cao cấp", label: "Cao cấp" },
]

const BLOOD_TYPE_OPTIONS = [
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
]

const HEALTH_CLASSIFICATION_OPTIONS = [
  { value: "Loại 1", label: "Loại 1" },
  { value: "Loại 2", label: "Loại 2" },
  { value: "Loại 3", label: "Loại 3" },
  { value: "Loại 4", label: "Loại 4" },
  { value: "Loại 5", label: "Loại 5" },
  { value: "Loại 6", label: "Loại 6" },
]

const RELATIONSHIP_OPTIONS = [
  { value: "Cha", label: "Cha" },
  { value: "Mẹ", label: "Mẹ" },
  { value: "Vợ", label: "Vợ" },
  { value: "Chồng", label: "Chồng" },
  { value: "Con trai", label: "Con trai" },
  { value: "Con gái", label: "Con gái" },
  { value: "Anh trai", label: "Anh trai" },
  { value: "Chị gái", label: "Chị gái" },
  { value: "Em trai", label: "Em trai" },
  { value: "Em gái", label: "Em gái" },
  { value: "Ông nội", label: "Ông nội" },
  { value: "Bà nội", label: "Bà nội" },
  { value: "Ông ngoại", label: "Ông ngoại" },
  { value: "Bà ngoại", label: "Bà ngoại" },
  { value: "Khác", label: "Khác" },
]

// ============================================================
// INTERFACES
// ============================================================

interface WorkProcess {
  id: string
  FromDate?: string
  ToDate?: string
  WorkDescription?: string
  RankID?: string
  PartyPosition?: string
  Description?: string
}

interface TrainingProcess {
  id: string
  SchoolName?: string
  MajorName?: string
  FromDate?: string
  ToDate?: string
  TrainingType?: string
  Certificate?: string
  Description?: string
}

interface FamilyMember {
  id: string
  FullName: string
  Relationship: string
  DateOfBirth?: string
  Occupation?: string
  Workplace?: string
  PhoneNumber?: string
  Address?: string
  IsDependent: boolean
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function AddSoldierPage() {
  const router = useRouter()
  const { message } = App.useApp()
  const { user, isLoading } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  // Dropdown data
  const [unitOptions, setUnitOptions] = useState<any[]>([])
  const [rankOptions, setRankOptions] = useState<any[]>([])
  const [provinceOptions, setProvinceOptions] = useState<any[]>([])
  const [wardOptions, setWardOptions] = useState<any[]>([])
  const [religionOptions, setReligionOptions] = useState<any[]>([])
  const [maritalOptions, setMaritalOptions] = useState<any[]>([])

  // Cascading dropdown state
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | undefined>(undefined)
  const filteredWardOptions = selectedProvinceId
    ? wardOptions.filter((w: any) => w.ProvinceID === selectedProvinceId).map((w: any) => ({ value: w.WardID, label: w.WardName }))
    : []

  // Work processes
  const [workProcesses, setWorkProcesses] = useState<WorkProcess[]>([])

  // Training processes
  const [trainingProcesses, setTrainingProcesses] = useState<TrainingProcess[]>([])

  // Family members
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])

  // Photo preview
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Redirect nếu chưa đăng nhập
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login")
    }
  }, [user, isLoading, router])

  // Load dropdown data
  useEffect(() => {
    if (user?.userId) {
      loadDropdownData()
    }
  }, [user])

  const loadDropdownData = async () => {
    if (!user?.userId) return

    try {
      const [ranksRes, provincesRes, wardsRes, religionsRes, maritalRes, unitsRes] = await Promise.all([
        fetch(`/api/dropdowns?userId=${user.userId}&mode=RANK`),
        fetch(`/api/dropdowns?userId=${user.userId}&mode=PROVINCE`),
        fetch(`/api/dropdowns?userId=${user.userId}&mode=WARD`),
        fetch(`/api/dropdowns?userId=${user.userId}&mode=RELIGION`),
        fetch(`/api/dropdowns?userId=${user.userId}&mode=MARITAL`),
        fetch(`/api/units?userId=${user.userId}`),
      ])

      const [ranksData, provincesData, wardsData, religionsData, maritalData, unitsData] = await Promise.all([
        ranksRes.json(),
        provincesRes.json(),
        wardsRes.json(),
        religionsRes.json(),
        maritalRes.json(),
        unitsRes.json(),
      ])

      if (Array.isArray(ranksData.data)) {
        setRankOptions(ranksData.data.map((r: any) => ({ value: r.RankID, label: r.RankName })))
      }

      if (Array.isArray(provincesData.data)) {
        setProvinceOptions(provincesData.data.map((p: any) => ({ value: p.ProvinceID, label: p.ProvinceName })))
      }

      if (Array.isArray(wardsData.data)) {
        setWardOptions(wardsData.data)
      }

      if (Array.isArray(religionsData.data)) {
        setReligionOptions(religionsData.data.map((r: any) => ({ value: r.ReligionID, label: r.ReligionName })))
      }

      if (Array.isArray(maritalData.data)) {
        setMaritalOptions(maritalData.data.map((m: any) => ({ value: m.MaritalStatusID, label: m.MaritalStatusName })))
      }

      if (unitsData.success) {
        setUnitOptions(unitsData.data.map((u: any) => ({ value: u.UnitID, label: u.FullPathName })))
        console.log(unitsData.data.map);
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error)
    }
  }

  const handleNext = async () => {
    try {
      await form.validateFields()
      setCurrentStep(currentStep + 1)
    } catch (error) {
      message.error("Vui lòng điền đầy đủ thông tin bắt buộc")
    }
  }

  const handleBack = () => {
    setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const values = form.getFieldsValue(true)
      
      // Convert photo to base64 if exists
      let photoData = null
      if (photoFile) {
        const reader = new FileReader()
        photoData = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(photoFile)
        })
      }
      
      // Prepare payload (Theo soldier-form.tsx)
      const payload = {
        ...values,
        DateOfBirth: values.DateOfBirth ? values.DateOfBirth.format("YYYY-MM-DD") : null,
        EnlistmentDate: values.EnlistmentDate ? values.EnlistmentDate.format("YYYY-MM-DD") : null,
        PartyJoinDate: values.PartyJoinDate ? values.PartyJoinDate.format("YYYY-MM-DD") : null,
        YouthUnionJoinDate: values.YouthUnionJoinDate ? values.YouthUnionJoinDate.format("YYYY-MM-DD") : null,
        WorkProcesses: workProcesses,
        TrainingProcesses: trainingProcesses,
        FamilyMembers: familyMembers,
        PhotoData: photoData,
        CreatedBy: user?.userId,
      }

      const response = await fetch("/api/soldiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.success) {
        message.success("Thêm quân nhân thành công!")
        setCurrentStep(4)
      } else {
        message.error(result.message || "Có lỗi xảy ra")
      }
    } catch (error) {
      console.error("Lỗi:", error)
      message.error("Có lỗi xảy ra")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push("/soldiers")
  }

  const handleSaveDraft = () => {
    message.info("Đã lưu nháp")
  }

  // Work process handlers
  const handleAddWorkProcess = () => {
    const newProcess: WorkProcess = {
      id: Date.now().toString(),
      FromDate: "",
      ToDate: "",
      WorkDescription: "",
      RankID: "",
      PartyPosition: "",
      Description: "",
    }
    setWorkProcesses([newProcess, ...workProcesses])
  }

  const handleDeleteWorkProcess = (id: string) => {
    setWorkProcesses(workProcesses.filter((p) => p.id !== id))
  }

  const handleUpdateWorkProcess = (id: string, field: keyof WorkProcess, value: string) => {
    setWorkProcesses(workProcesses.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  // Training process handlers
  const handleAddTrainingProcess = () => {
    const newProcess: TrainingProcess = {
      id: Date.now().toString(),
      SchoolName: "",
      MajorName: "",
      FromDate: "",
      ToDate: "",
      TrainingType: "",
      Certificate: "",
      Description: "",
    }
    setTrainingProcesses([newProcess, ...trainingProcesses])
  }

  const handleDeleteTrainingProcess = (id: string) => {
    setTrainingProcesses(trainingProcesses.filter((p) => p.id !== id))
  }

  const handleUpdateTrainingProcess = (id: string, field: keyof TrainingProcess, value: string) => {
    setTrainingProcesses(trainingProcesses.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  // Family member handlers
  const handleAddFamilyMember = () => {
    const newMember: FamilyMember = {
      id: Date.now().toString(),
      FullName: "",
      Relationship: "",
      DateOfBirth: "",
      Occupation: "",
      Workplace: "",
      PhoneNumber: "",
      Address: "",
      IsDependent: false,
    }
    setFamilyMembers([newMember, ...familyMembers])
  }

  const handleDeleteFamilyMember = (id: string) => {
    setFamilyMembers(familyMembers.filter((m) => m.id !== id))
  }

  const handleUpdateFamilyMember = (id: string, field: keyof FamilyMember, value: any) => {
    setFamilyMembers(familyMembers.map((m) => (m.id === id ? { ...m, [field]: value } : m)))
  }

  // Photo upload handler
  const handlePhotoChange = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      message.error("Kích thước ảnh không được vượt quá 5MB")
      return false
    }
    
    const reader = new FileReader()
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string)
      setPhotoFile(file)
    }
    reader.readAsDataURL(file)
    return false
  }

  const handleRemovePhoto = () => {
    setPhotoPreview(null)
    setPhotoFile(null)
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
  // RENDER STEPS
  // ============================================================

  const renderStep1 = () => (
    <div>
      <Alert message="Vui lòng nhập đầy đủ thông tin để tiếp tục" type="info" showIcon style={{ marginBottom: 24 }} />

      {/* Section: Ảnh quân nhân */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#4b5320", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #4b5320" }}>
          Ảnh quân nhân
        </div>

        <Row gutter={16}>
          <Col span={24}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ width: 150, height: 200, border: "2px dashed #d9d9d9", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: photoPreview ? "none" : "#fafafa" }}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ textAlign: "center", color: "#8c8c8c" }}>
                    <UserOutlined style={{ fontSize: 48, marginBottom: 8 }} />
                    <div style={{ fontSize: 12 }}>Chưa có ảnh</div>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Upload accept="image/jpeg,image/jpg,image/png" beforeUpload={handlePhotoChange} showUploadList={false}>
                  <Button icon={<UploadOutlined />} type="primary" style={{ background: "#3a4d2e", borderColor: "#3a4d2e" }}>
                    {photoPreview ? "Đổi ảnh" : "Tải ảnh lên"}
                  </Button>
                </Upload>
                {photoPreview && (
                  <Button icon={<DeleteOutlined />} danger onClick={handleRemovePhoto}>
                    Xóa ảnh
                  </Button>
                )}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Định dạng: JPG, PNG. Tối đa 5MB
                </Text>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* Section: Thông tin cơ bản */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#4b5320", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #4b5320" }}>
          Thông tin cơ bản
        </div>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="SoldierID" label="Mã quân nhân" rules={[{ required: true, message: "Nhập mã quân nhân" }]}>
              <Input placeholder="VD: S001" />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item name="FullName" label="Họ và tên" rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}>
              <Input placeholder="Nhập họ và tên" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="RankID" label="Cấp bậc" rules={[{ required: true, message: "Chọn cấp bậc" }]}>
              <Select placeholder="Chọn cấp bậc" options={rankOptions} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="Position" label="Chức vụ">
              <Input placeholder="Nhập chức vụ" />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item name="UnitID" label="Đơn vị" rules={[{ required: true, message: "Chọn đơn vị" }]}>
              <Select showSearch placeholder="Chọn đơn vị" optionFilterProp="label" options={unitOptions} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="Hometown" label="Quê quán">
              <Input placeholder="Nhập quê quán" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="Address" label="Địa chỉ">
              <Input placeholder="Nhập địa chỉ (số nhà, đường...)" />
            </Form.Item>
          </Col>
        </Row>
      </div>

      {/* Section: Thông tin cá nhân */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#4b5320", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #4b5320" }}>
          Thông tin cá nhân
        </div>

        <Row gutter={16}>
          <Col span={4}>
            <Form.Item name="Ethnicity" label="Dân tộc">
              {/* <Select options={ETHNICITY_OPTIONS} defaultValue="Kinh" /> */}
              <Input placeholder="Nhập dân tộc" />
            </Form.Item>
          </Col>
          <Col span={5}>
            <Form.Item name="Religion" label="Tôn giáo">
              {/* <Select options={religionOptions} placeholder="Chọn tôn giáo" /> */}
              <Input placeholder="Nhập tôn giáo" />
            </Form.Item>
          </Col>
          <Col span={5}>
            <Form.Item name="MaritalStatusID" label="Tình trạng hôn nhân">
              <Select options={maritalOptions} placeholder="Chọn tình trạng" />
            </Form.Item>
          </Col>
          <Col span={5}>
            <Form.Item name="DateOfBirth" label="Ngày sinh" rules={[{ required: true, message: "Chọn ngày sinh" }]}>
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={5}>
            <Form.Item name="CitizenID" label="CCCD" rules={[{ required: true, message: "Nhập số CCCD" }]}>
              <Input placeholder="Số CCCD" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="Gender" label="Giới tính">
              <Select defaultValue={1}>
                <Option value={1}>Nam</Option>
                <Option value={0}>Nữ</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </div>

      {/* Section: Thường trú */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#4b5320", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #4b5320" }}>
          Thường trú
        </div>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="ProvinceID" label="Tỉnh/Thành phố">
              <Select
                placeholder="Chọn tỉnh/thành"
                options={provinceOptions}
                onChange={(value) => {
                  setSelectedProvinceId(value)
                  form.setFieldValue("WardID", undefined)
                }}
                showSearch
                optionFilterProp="label"
                allowClear
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="WardID" label="Xã/Phường">
              <Select
                placeholder="Chọn xã/phường"
                options={filteredWardOptions}
                showSearch
                optionFilterProp="label"
                allowClear
                disabled={!selectedProvinceId}
                notFoundContent={selectedProvinceId ? "Không có xã/phường" : "Vui lòng chọn tỉnh/thành trước"}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="DetailedAddress" label="Địa chỉ chi tiết">
              <Input placeholder="Số nhà, đường..." />
            </Form.Item>
          </Col>
        </Row>
      </div>

      {/* Section: Thông tin quân sự */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#4b5320", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #4b5320" }}>
          Thông tin quân sự
        </div>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item name="EnlistmentDate" label="Ngày nhập ngũ" rules={[{ required: true, message: "Chọn ngày nhập ngũ" }]}>
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="EducationLevel" label="Trình độ văn hoá">
              <Select options={EDUCATION_OPTIONS} placeholder="Chọn trình độ" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="Specialization" label="Chuyên môn">
              <Input placeholder="Nhập chuyên môn" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="PoliticalLevel" label="Trình độ chính trị">
              <Select options={POLITICAL_LEVEL_OPTIONS} placeholder="Chọn trình độ" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="YouthUnionJoinDate" label="Ngày vào Đoàn">
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="PartyJoinDate" label="Ngày vào Đảng">
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="StatusID" label="Trạng thái">
              <Select options={STATUS_OPTIONS} defaultValue="ST001" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="SoldierType" label="Loại quân nhân" rules={[{ required: true, message: "Chọn loại quân nhân" }]}>
              <Select placeholder="Chọn loại quân nhân">
                <Option value="CS">CS (Chiến sĩ)</Option>
                <Option value="HSQ-CS">HSQ-CS (Hạ sĩ quan - Chiến sĩ)</Option>
                <Option value="QNCN">QNCN (Quân nhân chuyên nghiệp)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </div>

      {/* Section: Sức khỏe */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#4b5320", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #4b5320" }}>
          Sức khỏe
        </div>

        <Row gutter={16}>
          <Col span={4}>
            <Form.Item name="Height" label="Chiều cao (cm)">
              <InputNumber min={100} max={220} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="Weight" label="Cân nặng (kg)">
              <InputNumber min={40} max={150} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="BloodType" label="Nhóm máu">
              <Select options={BLOOD_TYPE_OPTIONS} placeholder="Chọn" allowClear />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="BloodPressure" label="Huyết áp">
              <Input placeholder="VD: 120/80" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="HealthClassification" label="Phân loại sức khỏe">
              <Select options={HEALTH_CLASSIFICATION_OPTIONS} defaultValue="Loại 1" />
            </Form.Item>
          </Col>
        </Row>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div>
      <Alert message="Khai báo thông tin thân nhân của quân nhân" type="info" showIcon style={{ marginBottom: 24 }} />

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TeamOutlined style={{ fontSize: 18, color: "#3a4d2e" }} />
            <Title level={5} style={{ margin: 0, color: "#212121" }}>
              Thân nhân
            </Title>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddFamilyMember} style={{ background: "#3a4d2e", borderColor: "#3a4d2e" }}>
            Thêm thân nhân
          </Button>
        </div>

        {familyMembers.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#8c8c8c" }}>
            <TeamOutlined style={{ fontSize: 40, marginBottom: 12 }} />
            <div>Chưa có thân nhân nào</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {familyMembers.map((member) => (
              <Card key={member.id} size="small" style={{ borderRadius: 8 }} extra={<Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteFamilyMember(member.id)} />}>
                <Row gutter={16}>
                  <Col span={6}>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Quan hệ <span style={{ color: "#ff4d4f" }}>*</span></div>
                    <Select value={member.Relationship || undefined} onChange={(value) => handleUpdateFamilyMember(member.id, "Relationship", value)} placeholder="Chọn quan hệ" style={{ width: "100%" }} options={RELATIONSHIP_OPTIONS} />
                  </Col>
                  <Col span={10}>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Họ và tên <span style={{ color: "#ff4d4f" }}>*</span></div>
                    <Input value={member.FullName} onChange={(e) => handleUpdateFamilyMember(member.id, "FullName", e.target.value)} placeholder="Nhập họ và tên" />
                  </Col>
                  <Col span={8}>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Ngày sinh</div>
                    <Input value={member.DateOfBirth} onChange={(e) => handleUpdateFamilyMember(member.id, "DateOfBirth", e.target.value)} placeholder="dd/mm/yyyy" />
                  </Col>
                </Row>

                <Row gutter={16} style={{ marginTop: 12 }}>
                  <Col span={8}>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Số điện thoại</div>
                    <Input value={member.PhoneNumber} onChange={(e) => handleUpdateFamilyMember(member.id, "PhoneNumber", e.target.value)} placeholder="Nhập số điện thoại" />
                  </Col>
                  <Col span={8}>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Nghề nghiệp</div>
                    <Input value={member.Occupation} onChange={(e) => handleUpdateFamilyMember(member.id, "Occupation", e.target.value)} placeholder="Nhập nghề nghiệp" />
                  </Col>
                  <Col span={8}>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Nơi công tác</div>
                    <Input value={member.Workplace} onChange={(e) => handleUpdateFamilyMember(member.id, "Workplace", e.target.value)} placeholder="Nhập nơi công tác" />
                  </Col>
                </Row>

                <Row gutter={16} style={{ marginTop: 12 }}>
                  <Col span={16}>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Địa chỉ</div>
                    <Input value={member.Address} onChange={(e) => handleUpdateFamilyMember(member.id, "Address", e.target.value)} placeholder="Nhập địa chỉ" />
                  </Col>
                  <Col span={8}>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Người phụ thuộc</div>
                    <Switch checked={member.IsDependent} onChange={(checked) => handleUpdateFamilyMember(member.id, "IsDependent", checked)} checkedChildren="Có" unCheckedChildren="Không" />
                  </Col>
                </Row>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div>
      <Alert message="Khai báo quá trình công tác và đào tạo của quân nhân" type="info" showIcon style={{ marginBottom: 24 }} />

      {/* Quá trình công tác */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileTextOutlined style={{ fontSize: 18, color: "#3a4d2e" }} />
            <Title level={5} style={{ margin: 0, color: "#212121" }}>
              Quá trình công tác
            </Title>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddWorkProcess} style={{ background: "#3a4d2e", borderColor: "#3a4d2e" }}>
            Thêm quá trình công tác
          </Button>
        </div>

        {workProcesses.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#8c8c8c" }}>
            <FileTextOutlined style={{ fontSize: 40, marginBottom: 12 }} />
            <div>Chưa có quá trình công tác nào</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {workProcesses.map((process) => (
              <Card key={process.id} size="small" style={{ borderRadius: 8 }} extra={<Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteWorkProcess(process.id)} />}>
                <Row gutter={16}>
                  <Col span={6}>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Ngày từ</div>
                    <Input value={process.FromDate} onChange={(e) => handleUpdateWorkProcess(process.id, "FromDate", e.target.value)} placeholder="Nhập ngày từ" />
                  </Col>
                  <Col span={6}>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Ngày đến</div>
                    <Input value={process.ToDate} onChange={(e) => handleUpdateWorkProcess(process.id, "ToDate", e.target.value)} placeholder="Nhập ngày đến" />
                  </Col>
                  <Col span={6}>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Cấp bậc</div>
                    <Input value={process.RankID} onChange={(e) => handleUpdateWorkProcess(process.id, "RankID", e.target.value)} placeholder="Nhập cấp bậc" />
                  </Col>
                  <Col span={6}>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Chức vụ Đảng, đoàn thể</div>
                    <Input value={process.PartyPosition} onChange={(e) => handleUpdateWorkProcess(process.id, "PartyPosition", e.target.value)} placeholder="Nhập chức vụ" />
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: 12 }}>
                  <Col span={24}>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Chức vụ, đơn vị, binh chủng, chiến trường</div>
                    <Input.TextArea rows={2} value={process.WorkDescription} onChange={(e) => handleUpdateWorkProcess(process.id, "WorkDescription", e.target.value)} placeholder="Nhập quá trình công tác" />
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: 12 }}>
                  <Col span={24}>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Ghi chú</div>
                    <Input.TextArea rows={2} value={process.Description} onChange={(e) => handleUpdateWorkProcess(process.id, "Description", e.target.value)} placeholder="Nhập ghi chú" />
                  </Col>
                </Row>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quá trình đào tạo */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileTextOutlined style={{ fontSize: 18, color: "#3a4d2e" }} />
            <Title level={5} style={{ margin: 0, color: "#212121" }}>
              Quá trình đào tạo
            </Title>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTrainingProcess} style={{ background: "#3a4d2e", borderColor: "#3a4d2e" }}>
            Thêm quá trình đào tạo
          </Button>
        </div>

        {trainingProcesses.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#8c8c8c" }}>
            <FileTextOutlined style={{ fontSize: 40, marginBottom: 12 }} />
            <div>Chưa có quá trình đào tạo nào</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {trainingProcesses.map((process) => (
              <Card key={process.id} size="small" style={{ borderRadius: 8 }} extra={<Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteTrainingProcess(process.id)} />}>
                <Row gutter={16}>
                  <Col span={8}>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Tên trường đào tạo</div>
                    <Input value={process.SchoolName} onChange={(e) => handleUpdateTrainingProcess(process.id, "SchoolName", e.target.value)} placeholder="Nhập tên trường" />
                  </Col>
                  <Col span={8}>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Ngành học hoặc tên lớp học</div>
                    <Input value={process.MajorName} onChange={(e) => handleUpdateTrainingProcess(process.id, "MajorName", e.target.value)} placeholder="Nhập ngành/lớp" />
                  </Col>
                  <Col span={8}>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Hình thức đào tạo</div>
                    <Input value={process.TrainingType} onChange={(e) => handleUpdateTrainingProcess(process.id, "TrainingType", e.target.value)} placeholder="Nhập hình thức" />
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: 12 }}>
                  <Col span={8}>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Ngày từ</div>
                    <Input value={process.FromDate} onChange={(e) => handleUpdateTrainingProcess(process.id, "FromDate", e.target.value)} placeholder="Nhập ngày từ" />
                  </Col>
                  <Col span={8}>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Ngày đến</div>
                    <Input value={process.ToDate} onChange={(e) => handleUpdateTrainingProcess(process.id, "ToDate", e.target.value)} placeholder="Nhập ngày đến" />
                  </Col>
                  <Col span={8}>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Bằng cấp, chứng chỉ</div>
                    <Input value={process.Certificate} onChange={(e) => handleUpdateTrainingProcess(process.id, "Certificate", e.target.value)} placeholder="Nhập bằng cấp" />
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: 12 }}>
                  <Col span={24}>
                    <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 500 }}>Ghi chú</div>
                    <Input.TextArea rows={2} value={process.Description} onChange={(e) => handleUpdateTrainingProcess(process.id, "Description", e.target.value)} placeholder="Nhập ghi chú" />
                  </Col>
                </Row>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderStep4 = () => {
    const values = form.getFieldsValue(true)
    const formatDate = (date: any) => date ? dayjs(date).format("DD/MM/YYYY") : "—"
    
    // Helper functions to get labels
    const getRankLabel = (rankId: string) => {
      const rank = rankOptions.find(r => r.value === rankId)
      return rank ? rank.label : rankId || "—"
    }
    
    const getUnitLabel = (unitId: string) => {
      const unit = unitOptions.find(u => u.value === unitId)
      return unit ? unit.label : unitId || "—"
    }
    
    const getReligionLabel = (religionId: string) => {
      const religion = religionOptions.find(r => r.value === religionId)
      return religion ? religion.label : religionId || "—"
    }
    
    const getMaritalLabel = (maritalId: string) => {
      const marital = maritalOptions.find(m => m.value === maritalId)
      return marital ? marital.label : maritalId || "—"
    }
    
    const getProvinceLabel = (provinceId: string) => {
      const province = provinceOptions.find(p => p.value === provinceId)
      return province ? province.label : provinceId || ""
    }
    
    const getWardLabel = (wardId: string) => {
      const ward = wardOptions.find((w: any) => w.WardID === wardId)
      return ward ? ward.WardName : wardId || ""
    }

    return (
      <div>
        <Alert message="Vui lòng kiểm tra lại thông tin trước khi xác nhận" type="warning" showIcon style={{ marginBottom: 24 }} />

        {/* Ảnh quân nhân */}
        {photoPreview && (
          <Card title="Ảnh quân nhân" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <img src={photoPreview} alt="Ảnh quân nhân" style={{ maxWidth: 200, maxHeight: 280, borderRadius: 8 }} />
            </div>
          </Card>
        )}

        {/* Thông tin cơ bản */}
        <Card title="Thông tin cơ bản" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={12}><Text strong style={{ color: "#666" }}>Mã quân nhân:</Text> <Text>{values.SoldierID || "—"}</Text></Col>
            <Col span={12}><Text strong style={{ color: "#666" }}>Họ và tên:</Text> <Text>{values.FullName || "—"}</Text></Col>
            <Col span={12}><Text strong style={{ color: "#666" }}>Cấp bậc:</Text> <Text>{getRankLabel(values.RankID)}</Text></Col>
            <Col span={12}><Text strong style={{ color: "#666" }}>Chức vụ:</Text> <Text>{values.Position || "—"}</Text></Col>
            <Col span={12}><Text strong style={{ color: "#666" }}>Đơn vị:</Text> <Text>{getUnitLabel(values.UnitID)}</Text></Col>
            <Col span={12}><Text strong style={{ color: "#666" }}>Quê quán:</Text> <Text>{values.Hometown || "—"}</Text></Col>
            <Col span={12}><Text strong style={{ color: "#666" }}>Địa chỉ:</Text> <Text>{values.Address || "—"}</Text></Col>
          </Row>
        </Card>

        {/* Thông tin cá nhân TVC */}
        <Card title="Thông tin cá nhân" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={8}><Text strong style={{ color: "#666" }}>Ngày sinh:</Text> <Text>{formatDate(values.DateOfBirth)}</Text></Col>
            <Col span={8}><Text strong style={{ color: "#666" }}>CCCD:</Text> <Text>{values.CitizenID || "—"}</Text></Col>
            <Col span={8}><Text strong style={{ color: "#666" }}>Giới tính:</Text> <Text>{values.Gender === 1 ? "Nam" : "Nữ"}</Text></Col>
            <Col span={8}><Text strong style={{ color: "#666" }}>Dân tộc:</Text> <Text>{values.Ethnicity || "—"}</Text></Col>
            <Col span={8}><Text strong style={{ color: "#666" }}>Tôn giáo:</Text> <Text>{values.Religion || "—"}</Text></Col>
            <Col span={8}><Text strong style={{ color: "#666" }}>Tình trạng hôn nhân:</Text> <Text>{getMaritalLabel(values.MaritalStatusID)}</Text></Col>
          </Row>
        </Card>

        {/* Thường trú */}
        <Card title="Thường trú" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={8}><Text strong style={{ color: "#666" }}>Tỉnh/Thành phố:</Text> <Text>{getProvinceLabel(values.ProvinceID)}</Text></Col>
            <Col span={8}><Text strong style={{ color: "#666" }}>Xã/Phường:</Text> <Text>{getWardLabel(values.WardID)}</Text></Col>
            <Col span={8}><Text strong style={{ color: "#666" }}>Địa chỉ chi tiết:</Text> <Text>{values.DetailedAddress || "—"}</Text></Col>
          </Row>
        </Card>

        {/* Thông tin quân sự */}
        <Card title="Thông tin quân sự" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={8}><Text strong style={{ color: "#666" }}>Ngày nhập ngũ:</Text> <Text>{formatDate(values.EnlistmentDate)}</Text></Col>
            <Col span={8}><Text strong style={{ color: "#666" }}>Loại quân nhân:</Text> <Text>{values.SoldierType || "—"}</Text></Col>
            <Col span={8}><Text strong style={{ color: "#666" }}>Trạng thái:</Text> <Text>{STATUS_OPTIONS.find(s => s.value === values.StatusID)?.label || "—"}</Text></Col>
            <Col span={8}><Text strong style={{ color: "#666" }}>Trình độ văn hoá:</Text> <Text>{values.EducationLevel || "—"}</Text></Col>
            <Col span={8}><Text strong style={{ color: "#666" }}>Chuyên môn:</Text> <Text>{values.Specialization || "—"}</Text></Col>
            <Col span={8}><Text strong style={{ color: "#666" }}>Trình độ chính trị:</Text> <Text>{values.PoliticalLevel || "—"}</Text></Col>
            <Col span={8}><Text strong style={{ color: "#666" }}>Ngày vào Đoàn:</Text> <Text>{formatDate(values.YouthUnionJoinDate)}</Text></Col>
            <Col span={8}><Text strong style={{ color: "#666" }}>Ngày vào Đảng:</Text> <Text>{formatDate(values.PartyJoinDate)}</Text></Col>
          </Row>
        </Card>

        {/* Sức khỏe */}
        <Card title="Sức khỏe" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={6}><Text strong style={{ color: "#666" }}>Chiều cao:</Text> <Text>{values.Height ? `${values.Height} cm` : "—"}</Text></Col>
            <Col span={6}><Text strong style={{ color: "#666" }}>Cân nặng:</Text> <Text>{values.Weight ? `${values.Weight} kg` : "—"}</Text></Col>
            <Col span={6}><Text strong style={{ color: "#666" }}>Nhóm máu:</Text> <Text>{values.BloodType || "—"}</Text></Col>
            <Col span={6}><Text strong style={{ color: "#666" }}>Huyết áp:</Text> <Text>{values.BloodPressure || "—"}</Text></Col>
            <Col span={6}><Text strong style={{ color: "#666" }}>Phân loại sức khỏe:</Text> <Text>{values.HealthClassification || "—"}</Text></Col>
          </Row>
        </Card>

        {/* Thân nhân */}
        <Card title={`Thân nhân (${familyMembers.length})`} style={{ marginBottom: 16 }}>
          {familyMembers.length === 0 ? (
            <Text type="secondary">Không có thân nhân</Text>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {familyMembers.map((member) => (
                <div key={member.id} style={{ padding: 12, background: "#fafafa", borderRadius: 8 }}>
                  <Row gutter={16}>
                    <Col span={8}><Text strong style={{ color: "#666" }}>Họ và tên:</Text> <Text>{member.FullName || "—"}</Text></Col>
                    <Col span={8}><Text strong style={{ color: "#666" }}>Quan hệ:</Text> <Text>{member.Relationship || "—"}</Text></Col>
                    <Col span={8}><Text strong style={{ color: "#666" }}>Ngày sinh:</Text> <Text>{member.DateOfBirth || "—"}</Text></Col>
                  </Row>
                  <Row gutter={16} style={{ marginTop: 8 }}>
                    <Col span={8}><Text strong style={{ color: "#666" }}>SĐT:</Text> <Text>{member.PhoneNumber || "—"}</Text></Col>
                    <Col span={8}><Text strong style={{ color: "#666" }}>Nghề nghiệp:</Text> <Text>{member.Occupation || "—"}</Text></Col>
                    <Col span={8}><Text strong style={{ color: "#666" }}>Nơi công tác:</Text> <Text>{member.Workplace || "—"}</Text></Col>
                  </Row>
                  {member.Address && (
                    <Row gutter={16} style={{ marginTop: 8 }}>
                      <Col span={24}><Text strong style={{ color: "#666" }}>Địa chỉ:</Text> <Text>{member.Address}</Text></Col>
                    </Row>
                  )}
                  {member.IsDependent && (
                    <Row gutter={16} style={{ marginTop: 8 }}>
                      <Col span={24}><Tag color="green">Người phụ thuộc</Tag></Col>
                    </Row>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quá trình công tác & Đào tạo */}
        <Card title="Quá trình công tác & Đào tạo">
          <Row gutter={16}>
            <Col span={12}>
              <Text strong style={{ color: "#666" }}>Quá trình công tác:</Text> <Text>{workProcesses.length} mục</Text>
            </Col>
            <Col span={12}>
              <Text strong style={{ color: "#666" }}>Quá trình đào tạo:</Text> <Text>{trainingProcesses.length} mục</Text>
            </Col>
          </Row>
        </Card>
      </div>
    )
  }

  const renderStep5 = () => (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <CheckCircleOutlined style={{ fontSize: 64, color: "#52c41a", marginBottom: 24 }} />
      <Title level={3}>Thêm quân nhân thành công!</Title>
      <Text>Hồ sơ đã được lưu vào hệ thống.</Text>
      <div style={{ marginTop: 24 }}>
        <Button type="primary" onClick={() => router.push("/soldiers")} size="large">
          Về danh sách quân nhân
        </Button>
      </div>
    </div>
  )

  const steps = [
    { title: "Thông tin cơ bản", description: "Thông tin cá nhân, ảnh" },
    { title: "Thân nhân", description: "Thông tin gia đình" },
    { title: "Quá trình", description: "Công tác, đào tạo" },
    { title: "Xác nhận", description: "Kiểm tra thông tin" },
    { title: "Hoàn tất", description: "Thành công" },
  ]

  return (
    <PageLayout>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, color: "#212121" }}>Thêm quân nhân</Title>
        <div style={{ fontSize: 13, color: "#8c8c8c", marginTop: 4 }}>Trang chủ &gt; Quân nhân &gt; Thêm quân nhân</div>
      </div>

      <Card style={{ marginBottom: 20, borderRadius: 12 }} styles={{ body: { padding: "24px 32px" } }}>
        <Steps current={currentStep} items={steps} />
      </Card>

      <Card style={{ borderRadius: 12, marginBottom: 20 }} styles={{ body: { padding: "24px 32px" } }}>
        {/* <Form form={form} layout="vertical" initialValues={{ Gender: 1, Ethnicity: "Kinh", StatusID: "ST001", HealthClassification: "Loại 1" }}> */}
        <Form form={form} layout="vertical" initialValues={{ Gender: 1, StatusID: "ST001", HealthClassification: "Loại 1" }}>
          {currentStep === 0 && renderStep1()}
          {currentStep === 1 && renderStep2()}
          {currentStep === 2 && renderStep3()}
          {currentStep === 3 && renderStep4()}
          {currentStep === 4 && renderStep5()}
        </Form>
      </Card>

      {currentStep < 4 && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Button icon={<ArrowLeftOutlined />} onClick={currentStep === 0 ? handleCancel : handleBack} size="large">
            {currentStep === 0 ? "Hủy bỏ" : "Quay lại"}
          </Button>

          <Space>
            {currentStep > 0 && currentStep < 3 && (
              <Button icon={<SaveOutlined />} onClick={handleSaveDraft} size="large">
                Lưu tạm
              </Button>
            )}

            {currentStep < 3 && (
              <Button type="primary" icon={<ArrowRightOutlined />} onClick={handleNext} size="large" style={{ background: "#3a4d2e", borderColor: "#3a4d2e" }}>
                Tiếp tục
              </Button>
            )}

            {currentStep === 3 && (
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleSubmit} loading={loading} size="large" style={{ background: "#3a4d2e", borderColor: "#3a4d2e" }}>
                Xác nhận
              </Button>
            )}
          </Space>
        </div>
      )}
    </PageLayout>
  )
}
