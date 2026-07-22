/**
 * File: components/soldier-form.tsx
 * Mô tả: Form Thêm/Sửa chiến sĩ - đầy đủ các trường theo trang chi tiết + Tab Thân nhân
 * Cập nhật: 2026-07-03
 * 
 * Thay đổi mới:
 *   - Fix dropdown cấp bậc, tỉnh/thành, xã/phường không hiển thị khi sửa
 *   - Form sửa thân nhân đổi thành Modal popup (không cần cuộn)
 */

"use client"

import { useEffect, useState } from "react"
import { App, Button, Col, Form, Input, InputNumber, Modal, Row, Select, DatePicker, Divider, Tabs, Card, Space, Tag, Popconfirm, Switch } from "antd"
import { PlusOutlined, DeleteOutlined, EditOutlined, UserOutlined, TeamOutlined } from "@ant-design/icons"
import { useAuth } from "@/components/auth-provider"
import dayjs from "dayjs"

const { Option } = Select

// ============================================================
// INTERFACES
// ============================================================

interface SoldierFormProps {
  open: boolean
  onClose: () => void
  soldier?: any | null
  initialData?: any | null
  onSubmit?: (values: any) => void
  onSuccess?: () => void
}

interface FamilyMember {
  FamilyID?: string
  FullName: string
  Relationship: string
  DateOfBirth?: string
  Occupation?: string
  Workplace?: string
  PhoneNumber?: string
  Address?: string
  IsDependent: boolean
  isNew?: boolean
  isDeleted?: boolean
}

interface WorkProcess {
  WorkProcessID?: string
  FromDate?: string
  ToDate?: string
  WorkDescription?: string
  RankID?: string
  PartyPosition?: string
  Description?: string
}

interface TrainingProcess {
  TrainingID?: string
  SchoolName?: string
  MajorName?: string
  FromDate?: string
  ToDate?: string
  TrainingType?: string
  Certificate?: string
  Description?: string
}

// ============================================================
// STATIC OPTIONS
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
  { value: "THPT", label: "THPT" },
  { value: "Trung cấp", label: "Trung cấp" },
  { value: "Cao đẳng", label: "Cao đẳng" },
  { value: "Đại học", label: "Đại học" },
  { value: "Thạc sĩ", label: "Thạc sĩ" },
  { value: "Tiến sĩ", label: "Tiến sĩ" },
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
// MAIN COMPONENT
// ============================================================

export function SoldierForm({ open, onClose, soldier: soldierProp, initialData, onSuccess }: SoldierFormProps) {
  const soldier = soldierProp ?? initialData
  const { message } = App.useApp()
  const { user } = useAuth()
  const [form] = Form.useForm()
  const [familyForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  
  // Dropdown data
  const [unitTree, setUnitTree] = useState<any[]>([])
  const [rankOptions, setRankOptions] = useState<any[]>([])
  const [provinceOptions, setProvinceOptions] = useState<any[]>([])
  const [wardOptions, setWardOptions] = useState<any[]>([])
  const [religionOptions, setReligionOptions] = useState<any[]>([])
  const [maritalOptions, setMaritalOptions] = useState<any[]>([])
  
  // State cho Ward filter theo Province
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | undefined>(undefined)
  
  // State cho tab và thân nhân
  const [activeTab, setActiveTab] = useState("info")
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [workProcesses, setWorkProcesses] = useState<WorkProcess[]>([])
  const [trainingProcesses, setTrainingProcesses] = useState<TrainingProcess[]>([])
  const [editingFamilyIndex, setEditingFamilyIndex] = useState<number | null>(null)
  
  // Modal popup cho sửa thân nhân
  const [familyModalVisible, setFamilyModalVisible] = useState(false)

  const isEditMode = !!soldier

  // ============================================================
  // LOAD DROPDOWN DATA
  // ============================================================

  useEffect(() => {
    if (open && user?.userId) {
      loadAllDropdowns()
    }
  }, [open, user])

  const loadAllDropdowns = async () => {
    const userId = user?.userId
    if (!userId) return

    try {
      const [ranks, provinces, wards, religions, maritals, units] = await Promise.all([
        fetchDropdown('RANK'),
        fetchDropdown('PROVINCE'),
        fetchDropdown('WARD'),
        fetchDropdown('RELIGION'),
        fetchDropdown('MARITAL'),
        fetch(`/api/units?userId=${userId}`).then(r => r.json())
      ])

      setRankOptions(
  (ranks || []).map((r: any) => ({
    value: r.RankID,
    label: r.RankName,
  }))
);

setProvinceOptions(
  (provinces || []).map((p: any) => ({
    value: p.ProvinceID,
    label: p.ProvinceName,
  }))
);

setWardOptions(wards || []);

setReligionOptions(
  (religions || []).map((r: any) => ({
    value: r.ReligionID,
    label: r.ReligionName,
  }))
);

setMaritalOptions(
  (maritals || []).map((m: any) => ({
    value: m.MaritalStatusID,
    label: m.MaritalStatusName,
  }))
);
      
      if (units.success) {
        setUnitTree(units.data || [])
      }
    } catch (error) {
      console.error("Lỗi khi tải dropdown:", error)
    }
  }

  const fetchDropdown = async (mode: string) => {
  try {
    const response = await fetch(`/api/dropdowns?userId=${user?.userId}&mode=${mode}`);
    const result = await response.json();

    return Array.isArray(result.data) ? result.data : [];
  } catch (err) {
    console.error(mode, err);
    return [];
  }
};

  // ============================================================
  // FILTER WARD THEO PROVINCE
  // ============================================================

  const filteredWardOptions = selectedProvinceId 
    ? wardOptions
        .filter((w: any) => w.ProvinceID === selectedProvinceId)
        .map((w: any) => ({ value: w.WardID, label: w.WardName }))
    : []

  const handleProvinceChange = (provinceId: string) => {
    setSelectedProvinceId(provinceId)
    form.setFieldValue('WardID', undefined)
  }

  // ============================================================
  // FORM INIT
  // ============================================================

  useEffect(() => {
    if (open) {
      if (soldier) {
        // Mode Sửa - fill data với ID để dropdown hiển thị đúng
        const formData = {
          ...soldier,
          // Convert date string sang dayjs
          DateOfBirth: soldier.DateOfBirth ? dayjs(soldier.DateOfBirth) : null,
          EnlistmentDate: soldier.EnlistmentDate ? dayjs(soldier.EnlistmentDate) : null,
          PartyJoinDate: soldier.PartyJoinDate ? dayjs(soldier.PartyJoinDate) : null,
          YouthUnionJoinDate: soldier.YouthUnionJoinDate ? dayjs(soldier.YouthUnionJoinDate) : null,
          
          // Các trường ID cho dropdown (từ SP W01P0001 đã sửa)
          RankID: soldier.RankID,
          ReligionID: soldier.ReligionID,
          MaritalStatusID: soldier.MaritalStatusID,
          ProvinceID: soldier.ProvinceID,
          WardID: soldier.WardID,
        }
        
        form.setFieldsValue(formData)
        // Set Province để filter Ward
        if (soldier.ProvinceID) {
          setSelectedProvinceId(soldier.ProvinceID)
        }
        
        setWorkProcesses(Array.isArray(soldier.workProcesses) ? soldier.workProcesses : [])
        setTrainingProcesses(Array.isArray(soldier.trainingProcesses) ? soldier.trainingProcesses : [])
        loadFamilyMembers()
        loadProcessData()
      } else {
        // Mode Thêm - reset form
        form.resetFields()
        setFamilyMembers([])
        setWorkProcesses([])
        setTrainingProcesses([])
        setSelectedProvinceId(undefined)
      }
      setActiveTab("info")
      setFamilyModalVisible(false)
      setEditingFamilyIndex(null)
    }
  }, [open, soldier, form])

  // ============================================================
  // LOAD FAMILY MEMBERS
  // ============================================================

  const loadFamilyMembers = async () => {
    if (!soldier?.SoldierID) return
    try {
      const response = await fetch(`/api/soldiers/${soldier.SoldierID}/family?userId=${user?.userId}`)
      const result = await response.json()
      if (result.success) {
        setFamilyMembers(result.data || [])
      }
    } catch (error) {
      console.error("Lỗi khi tải thân nhân:", error)
    }
  }

  const loadProcessData = async () => {
    if (!soldier?.SoldierID) return
    try {
      const [workResponse, trainingResponse] = await Promise.all([
        fetch(`/api/soldiers/${soldier.SoldierID}/work-process?userId=${user?.userId}`),
        fetch(`/api/soldiers/${soldier.SoldierID}/training-process?userId=${user?.userId}`),
      ])

      const [workResult, trainingResult] = await Promise.all([
        workResponse.json(),
        trainingResponse.json(),
      ])

      if (workResult.success) {
        setWorkProcesses(workResult.data || [])
      }
      if (trainingResult.success) {
        setTrainingProcesses(trainingResult.data || [])
      }
    } catch (error) {
      console.error("Lỗi khi tải quá trình công tác/đào tạo:", error)
    }
  }

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const payload = {
        ...values,
        DateOfBirth: values.DateOfBirth ? values.DateOfBirth.format("YYYY-MM-DD") : null,
        EnlistmentDate: values.EnlistmentDate ? values.EnlistmentDate.format("YYYY-MM-DD") : null,
        PartyJoinDate: values.PartyJoinDate ? values.PartyJoinDate.format("YYYY-MM-DD") : null,
        YouthUnionJoinDate: values.YouthUnionJoinDate ? values.YouthUnionJoinDate.format("YYYY-MM-DD") : null,
      }

      let response
      if (isEditMode) {
        response = await fetch(`/api/soldiers/${soldier.SoldierID}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, LastModifiedBy: user?.userId }),
        })
      } else {
        response = await fetch("/api/soldiers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, CreatedBy: user?.userId }),
        })
      }

      const result = await response.json()

      if (result.success) {
        const soldierID = isEditMode ? soldier.SoldierID : result.data?.SoldierID
        if (soldierID) {
          await saveFamilyMembers(soldierID)
          await saveWorkProcesses(soldierID)
          await saveTrainingProcesses(soldierID)
        }

        message.success(isEditMode ? "Đã cập nhật thông tin chiến sĩ" : "Đã thêm chiến sĩ mới")
        form.resetFields()
        setFamilyMembers([])
        setWorkProcesses([])
        setTrainingProcesses([])
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
  // FAMILY MEMBERS CRUD
  // ============================================================

  const saveFamilyMembers = async (soldierID: string) => {
    try {
      for (const member of familyMembers) {
        if (member.isDeleted) {
          if (member.FamilyID) {
            await fetch(`/api/soldiers/${soldierID}/family/${member.FamilyID}?userId=${user?.userId}`, {
              method: "DELETE",
            })
          }
        } else if (member.isNew) {
          await fetch(`/api/soldiers/${soldierID}/family`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...member,
              DateOfBirth: member.DateOfBirth ? dayjs(member.DateOfBirth).format("YYYY-MM-DD") : null,
            }),
          })
        } else {
          if (member.FamilyID) {
            await fetch(`/api/soldiers/${soldierID}/family/${member.FamilyID}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...member,
                DateOfBirth: member.DateOfBirth ? dayjs(member.DateOfBirth).format("YYYY-MM-DD") : null,
              }),
            })
          }
        }
      }
    } catch (error) {
      console.error("Lỗi khi lưu thân nhân:", error)
    }
  }

  const handleAddFamily = () => {
    familyForm.resetFields()
    setEditingFamilyIndex(null)
    setFamilyModalVisible(true)
  }

  const handleEditFamily = (index: number) => {
    const member = familyMembers[index]
    const formValues: any = {
      FullName: member.FullName,
      Relationship: member.Relationship,
      Occupation: member.Occupation,
      Workplace: member.Workplace,
      PhoneNumber: member.PhoneNumber,
      Address: member.Address,
      IsDependent: !!member.IsDependent,
    }
    
    if (member.DateOfBirth) {
      formValues.DateOfBirth = dayjs(member.DateOfBirth)
    }
    
    familyForm.setFieldsValue(formValues)
    setEditingFamilyIndex(index)
    setFamilyModalVisible(true)
  }

  const handleSaveFamily = async () => {
    try {
      const values = await familyForm.validateFields()
      const member: FamilyMember = {
        ...values,
        DateOfBirth: values.DateOfBirth ? values.DateOfBirth.format("YYYY-MM-DD") : null,
        IsDependent: values.IsDependent || false,
      }

      if (editingFamilyIndex !== null) {
        const updated = [...familyMembers]
        updated[editingFamilyIndex] = {
          ...updated[editingFamilyIndex],
          ...member,
          isNew: updated[editingFamilyIndex].isNew,
        }
        setFamilyMembers(updated)
      } else {
        setFamilyMembers([...familyMembers, { ...member, isNew: true }])
      }

      setFamilyModalVisible(false)
      familyForm.resetFields()
      setEditingFamilyIndex(null)
    } catch (error: any) {
      if (error.errorFields) {
        message.error("Vui lòng điền đầy đủ thông tin thân nhân")
      }
    }
  }

  const handleDeleteFamily = (index: number) => {
    const member = familyMembers[index]
    if (member.isNew) {
      setFamilyMembers(familyMembers.filter((_, i) => i !== index))
    } else {
      const updated = [...familyMembers]
      updated[index] = { ...updated[index], isDeleted: true }
      setFamilyMembers(updated)
    }
  }

  // ============================================================
  // WORK/TRAINING PROCESS CRUD
  // ============================================================

  const updateWorkProcess = (index: number, field: keyof WorkProcess, value: string) => {
    setWorkProcesses((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const updateTrainingProcess = (index: number, field: keyof TrainingProcess, value: string) => {
    setTrainingProcesses((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const saveWorkProcesses = async (soldierID: string) => {
    const response = await fetch(`/api/soldiers/${soldierID}/work-process`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: workProcesses }),
    })
    const result = await response.json()
    if (!result.success) {
      throw new Error(result.message || "Lỗi khi lưu quá trình công tác")
    }
  }

  const saveTrainingProcesses = async (soldierID: string) => {
    const response = await fetch(`/api/soldiers/${soldierID}/training-process`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: trainingProcesses }),
    })
    const result = await response.json()
    if (!result.success) {
      throw new Error(result.message || "Lỗi khi lưu quá trình đào tạo")
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: "#4b5320",
    marginBottom: 12,
    paddingBottom: 6,
    borderBottom: "1px solid #4b5320",
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—"
    try {
      return dayjs(dateStr).format("DD/MM/YYYY")
    } catch {
      return dateStr
    }
  }

  const tabItems = [
    {
      key: "info",
      label: (
        <span>
          <UserOutlined /> Thông tin chiến sĩ
        </span>
      ),
      children: (
        <div style={{ maxHeight: "55vh", overflowY: "auto", padding: "0 4px" }}>
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              Gender: 1,
              Ethnicity: "Kinh",
              ReligionID: "REL001",
              MaritalStatusID: "MAR001",
              StatusID: "ST001",
              HealthClassification: "Loại 1",
            }}
          >
            {/* SECTION 1: THÔNG TIN CƠ BẢN */}
            <div style={sectionTitleStyle}>Thông tin cơ bản</div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="FullName" label="Họ và tên" rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}>
                  <Input placeholder="Nhập họ và tên" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="RankID" label="Cấp bậc" rules={[{ required: true, message: "Chọn cấp bậc" }]}>
                  <Select placeholder="Chọn cấp bậc" options={rankOptions} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="Position" label="Chức vụ">
                  <Input placeholder="Nhập chức vụ" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="UnitID" label="Đơn vị">
  <Select
    showSearch
    placeholder="Chọn đơn vị"
    optionFilterProp="label"
    options={unitTree.map((u: any) => ({
      value: u.UnitID,
      label: u.FullPathName,
    }))}
  />
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

            <Divider style={{ margin: "8px 0" }} />

            {/* SECTION 2: THÔNG TIN CÁ NHÂN */}
            <div style={sectionTitleStyle}>Thông tin cá nhân</div>
            <Row gutter={16}>
              <Col span={4}>
                <Form.Item name="Ethnicity" label="Dân tộc">
                  <Select options={ETHNICITY_OPTIONS} />
                </Form.Item>
              </Col>
              <Col span={5}>
                <Form.Item name="ReligionID" label="Tôn giáo">
                  <Select options={religionOptions} placeholder="Chọn tôn giáo" />
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
                  <Select>
                    <Option value={1}>Nam</Option>
                    <Option value={0}>Nữ</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: "8px 0" }} />

            {/* SECTION 3: THƯỜNG TRÚ */}
            <div style={sectionTitleStyle}>Thường trú</div>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="ProvinceID" label="Tỉnh/Thành phố">
                  <Select
                    placeholder="Chọn tỉnh/thành"
                    options={provinceOptions}
                    onChange={handleProvinceChange}
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
                <Form.Item name="Address" label="Địa chỉ chi tiết">
                  <Input placeholder="Số nhà, đường..." />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: "8px 0" }} />

            {/* SECTION 4: THÔNG TIN QUÂN SỰ */}
            <div style={sectionTitleStyle}>Thông tin quân sự</div>
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
                  <Select options={STATUS_OPTIONS} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: "8px 0" }} />

            {/* SECTION 5: SỨC KHỎE */}
            <div style={sectionTitleStyle}>Sức khỏe</div>
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
                  <Select options={HEALTH_CLASSIFICATION_OPTIONS} />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      ),
    },
    {
      key: "family",
      label: (
        <span>
          <TeamOutlined /> Thân nhân ({familyMembers.filter(m => !m.isDeleted).length})
        </span>
      ),
      children: (
        <div style={{ maxHeight: "55vh", overflowY: "auto", padding: "0 4px" }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddFamily}
            style={{ marginBottom: 16 }}
          >
            Thêm thân nhân
          </Button>

          {familyMembers.filter(m => !m.isDeleted).length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#8c8c8c" }}>
              <TeamOutlined style={{ fontSize: 40, marginBottom: 12 }} />
              <div>Chưa có thông tin thân nhân</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {familyMembers.filter(m => !m.isDeleted).map((member, idx) => {
                const realIndex = familyMembers.indexOf(member)
                return (
                  <Card
                    key={member.FamilyID || `new-${idx}`}
                    size="small"
                    style={{ 
                      background: member.isNew ? "#f6ffed" : "#fafafa",
                      border: member.isNew ? "1px solid #b7eb8f" : "1px solid #d9d9d9",
                    }}
                    title={
                      <Space>
                        <Tag color="blue">{member.Relationship}</Tag>
                        <span style={{ fontWeight: 500 }}>{member.FullName}</span>
                        {member.IsDependent ? <Tag color="green">Phụ thuộc</Tag> : null}
                        {member.isNew && <Tag color="lime">Mới</Tag>}
                      </Space>
                    }
                    extra={
                      <Space>
                        <Button size="small" icon={<EditOutlined />} onClick={() => handleEditFamily(realIndex)} />
                        <Popconfirm
                          title="Xoá thân nhân này?"
                          onConfirm={() => handleDeleteFamily(realIndex)}
                          okText="Xoá"
                          cancelText="Huỷ"
                          okButtonProps={{ danger: true }}
                        >
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    }
                  >
                    <Row gutter={16}>
                      <Col span={8}>Ngày sinh: {formatDate(member.DateOfBirth || "")}</Col>
                      <Col span={8}>SĐT: {member.PhoneNumber || "—"}</Col>
                      <Col span={8}>Nơi công tác: {member.Workplace || "—"}</Col>
                    </Row>
                    {member.Address && (
                      <Row gutter={16} style={{ marginTop: 8 }}>
                        <Col span={24}>Địa chỉ: {member.Address}</Col>
                      </Row>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "workProcess",
      label: `Quá trình công tác (${workProcesses.length})`,
      children: (
        <div style={{ maxHeight: "55vh", overflowY: "auto", padding: "0 4px" }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setWorkProcesses([...workProcesses, {}])}
            style={{ marginBottom: 16 }}
          >
            Thêm quá trình công tác
          </Button>

          {workProcesses.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#8c8c8c" }}>
              <div>Chưa có quá trình công tác</div>
            </div>
          ) : (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {workProcesses.map((item, index) => (
                <Card
                  key={item.WorkProcessID || `work-${index}`}
                  size="small"
                  title={`Quá trình công tác ${index + 1}`}
                  extra={
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => setWorkProcesses(workProcesses.filter((_, i) => i !== index))}
                    >
                      Xoá
                    </Button>
                  }
                >
                  <Row gutter={16}>
                    <Col span={6}>
                      <div style={{ marginBottom: 6 }}>Ngày từ</div>
                      <Input
                        value={item.FromDate || ""}
                        placeholder="Nhập ngày từ"
                        onChange={(e) => updateWorkProcess(index, "FromDate", e.target.value)}
                      />
                    </Col>
                    <Col span={6}>
                      <div style={{ marginBottom: 6 }}>Ngày đến</div>
                      <Input
                        value={item.ToDate || ""}
                        placeholder="Nhập ngày đến"
                        onChange={(e) => updateWorkProcess(index, "ToDate", e.target.value)}
                      />
                    </Col>
                    <Col span={6}>
                      <div style={{ marginBottom: 6 }}>Cấp bậc</div>
                      <Input
                        value={item.RankID || ""}
                        placeholder="Nhập cấp bậc"
                        onChange={(e) => updateWorkProcess(index, "RankID", e.target.value)}
                      />
                    </Col>
                    <Col span={6}>
                      <div style={{ marginBottom: 6 }}>Chức vụ Đảng, đoàn thể</div>
                      <Input
                        value={item.PartyPosition || ""}
                        placeholder="Nhập chức vụ Đảng, đoàn thể"
                        onChange={(e) => updateWorkProcess(index, "PartyPosition", e.target.value)}
                      />
                    </Col>
                    <Col span={24} style={{ marginTop: 12 }}>
                      <div style={{ marginBottom: 6 }}>Chức vụ, đơn vị, binh chủng, chiến trường</div>
                      <Input.TextArea
                        rows={2}
                        value={item.WorkDescription || ""}
                        placeholder="Nhập quá trình công tác"
                        onChange={(e) => updateWorkProcess(index, "WorkDescription", e.target.value)}
                      />
                    </Col>
                    <Col span={24} style={{ marginTop: 12 }}>
                      <div style={{ marginBottom: 6 }}>Ghi chú</div>
                      <Input.TextArea
                        rows={2}
                        value={item.Description || ""}
                        placeholder="Nhập ghi chú"
                        onChange={(e) => updateWorkProcess(index, "Description", e.target.value)}
                      />
                    </Col>
                  </Row>
                </Card>
              ))}
            </Space>
          )}
        </div>
      ),
    },
    {
      key: "trainingProcess",
      label: `Quá trình đào tạo (${trainingProcesses.length})`,
      children: (
        <div style={{ maxHeight: "55vh", overflowY: "auto", padding: "0 4px" }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setTrainingProcesses([...trainingProcesses, {}])}
            style={{ marginBottom: 16 }}
          >
            Thêm quá trình đào tạo
          </Button>

          {trainingProcesses.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#8c8c8c" }}>
              <div>Chưa có quá trình đào tạo</div>
            </div>
          ) : (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {trainingProcesses.map((item, index) => (
                <Card
                  key={item.TrainingID || `training-${index}`}
                  size="small"
                  title={`Quá trình đào tạo ${index + 1}`}
                  extra={
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => setTrainingProcesses(trainingProcesses.filter((_, i) => i !== index))}
                    >
                      Xoá
                    </Button>
                  }
                >
                  <Row gutter={16}>
                    <Col span={8}>
                      <div style={{ marginBottom: 6 }}>Tên trường đào tạo</div>
                      <Input
                        value={item.SchoolName || ""}
                        placeholder="Nhập tên trường"
                        onChange={(e) => updateTrainingProcess(index, "SchoolName", e.target.value)}
                      />
                    </Col>
                    <Col span={8}>
                      <div style={{ marginBottom: 6 }}>Ngành học hoặc tên lớp học</div>
                      <Input
                        value={item.MajorName || ""}
                        placeholder="Nhập ngành/lớp"
                        onChange={(e) => updateTrainingProcess(index, "MajorName", e.target.value)}
                      />
                    </Col>
                    <Col span={8}>
                      <div style={{ marginBottom: 6 }}>Hình thức đào tạo</div>
                      <Input
                        value={item.TrainingType || ""}
                        placeholder="Nhập hình thức đào tạo"
                        onChange={(e) => updateTrainingProcess(index, "TrainingType", e.target.value)}
                      />
                    </Col>
                    <Col span={8} style={{ marginTop: 12 }}>
                      <div style={{ marginBottom: 6 }}>Ngày từ</div>
                      <Input
                        value={item.FromDate || ""}
                        placeholder="Nhập ngày từ"
                        onChange={(e) => updateTrainingProcess(index, "FromDate", e.target.value)}
                      />
                    </Col>
                    <Col span={8} style={{ marginTop: 12 }}>
                      <div style={{ marginBottom: 6 }}>Ngày đến</div>
                      <Input
                        value={item.ToDate || ""}
                        placeholder="Nhập ngày đến"
                        onChange={(e) => updateTrainingProcess(index, "ToDate", e.target.value)}
                      />
                    </Col>
                    <Col span={8} style={{ marginTop: 12 }}>
                      <div style={{ marginBottom: 6 }}>Bằng cấp, chứng chỉ</div>
                      <Input
                        value={item.Certificate || ""}
                        placeholder="Nhập bằng cấp/chứng chỉ"
                        onChange={(e) => updateTrainingProcess(index, "Certificate", e.target.value)}
                      />
                    </Col>
                    <Col span={24} style={{ marginTop: 12 }}>
                      <div style={{ marginBottom: 6 }}>Ghi chú</div>
                      <Input.TextArea
                        rows={2}
                        value={item.Description || ""}
                        placeholder="Nhập ghi chú"
                        onChange={(e) => updateTrainingProcess(index, "Description", e.target.value)}
                      />
                    </Col>
                  </Row>
                </Card>
              ))}
            </Space>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#4b5320" }}>
              {isEditMode ? "Sửa thông tin chiến sĩ" : "Thêm chiến sĩ mới"}
            </span>
          </div>
        }
        open={open}
        onCancel={onClose}
        width={900}
        footer={[
          <Button key="cancel" onClick={onClose}>Hủy</Button>,
          <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>
            {isEditMode ? "Cập nhật" : "Thêm mới"}
          </Button>,
        ]}
        styles={{ body: { padding: "16px 24px" } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Modal>

      {/* Modal popup cho sửa thân nhân */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TeamOutlined style={{ color: "#4b5320" }} />
            <span style={{ color: "#4b5320" }}>
              {editingFamilyIndex !== null ? "Sửa thân nhân" : "Thêm thân nhân mới"}
            </span>
          </div>
        }
        open={familyModalVisible}
        onCancel={() => {
          setFamilyModalVisible(false)
          familyForm.resetFields()
          setEditingFamilyIndex(null)
        }}
        width={700}
        footer={[
          <Button key="cancel" onClick={() => {
            setFamilyModalVisible(false)
            familyForm.resetFields()
            setEditingFamilyIndex(null)
          }}>
            Hủy
          </Button>,
          <Button key="submit" type="primary" onClick={handleSaveFamily}>
            {editingFamilyIndex !== null ? "Cập nhật" : "Thêm"}
          </Button>,
        ]}
      >
        <Form form={familyForm} layout="vertical">
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="Relationship" label="Quan hệ" rules={[{ required: true, message: "Chọn quan hệ" }]}>
                <Select options={RELATIONSHIP_OPTIONS} placeholder="Chọn quan hệ" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="FullName" label="Họ và tên" rules={[{ required: true, message: "Nhập họ tên" }]}>
                <Input placeholder="Nhập họ và tên" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="DateOfBirth" label="Ngày sinh">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="PhoneNumber" label="Số điện thoại">
                <Input placeholder="Nhập SĐT" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="Occupation" label="Nghề nghiệp">
                <Input placeholder="Nhập nghề nghiệp" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="Workplace" label="Nơi công tác">
                <Input placeholder="Nhập nơi công tác" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="Address" label="Địa chỉ">
                <Input placeholder="Nhập địa chỉ" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="IsDependent" label="Người phụ thuộc" valuePropName="checked">
                <Switch checkedChildren="Có" unCheckedChildren="Không" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  )
}