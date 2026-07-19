"use client"

import { useState } from "react"
import { App, Button, Cascader, Col, Form, Input, Modal, Row, Select, Typography } from "antd"
import type { Soldier } from "@/lib/soldiers"
import { RANK_TREE, UNIT_TREE, POSITIONS } from "@/lib/soldiers"
import { useChangeLog } from "@/lib/change-log"
import { useAuth } from "@/components/auth-provider"
import { ROLE_LABELS } from "@/lib/roles"

const { TextArea } = Input

const FIELD_LABELS: Record<string, string> = {
  fullName: "Họ và tên",
  citizenId: "CCCD/CMND",
  rank: "Cấp bậc",
  unit: "Đơn vị",
  position: "Chức vụ",
  status: "Trạng thái",
  phone: "Số điện thoại",
  address: "Địa chỉ",
  gender: "Giới tính",
}

interface ChangeRequestFormProps {
  open: boolean
  onClose: () => void
  soldier: Soldier
}

export function ChangeRequestForm({ open, onClose, soldier }: ChangeRequestFormProps) {
  const { message } = App.useApp()
  const { addLog } = useChangeLog()
  const { user } = useAuth()
  const [form] = Form.useForm()
  const [editedValues, setEditedValues] = useState<Record<string, any>>({})

  const getChanges = () => {
    const changes: { field: string; label: string; oldValue: string; newValue: string }[] = []

    Object.entries(editedValues).forEach(([field, newValue]) => {
      const oldValue = (soldier as any)[field]
      let oldDisplay = String(oldValue ?? "")
      let newDisplay = Array.isArray(newValue) ? newValue.join(" > ") : String(newValue ?? "")

      if (oldDisplay !== newDisplay && newDisplay !== "") {
        changes.push({
          field,
          label: FIELD_LABELS[field] || field,
          oldValue: oldDisplay,
          newValue: newDisplay,
        })
      }
    })

    return changes
  }

  const handleFinish = () => {
    const changes = getChanges()

    if (changes.length === 0) {
      message.warning("Không có thay đổi nào được ghi nhận.")
      return
    }

    addLog({
      soldierId: soldier.id,
      soldierName: soldier.fullName,
      requestedBy: user?.fullName || "Không xác định",
      requestedRole: user?.roleName || "Không xác định",
      changes,
      status: "pending",
    })

    message.success("Đề xuất thay đổi đã được gửi lên cấp trên!")
    form.resetFields()
    setEditedValues({})
    onClose()
  }

  return (
    <Modal
      open={open}
      title={`Đề xuất thay đổi: ${soldier.fullName}`}
      onCancel={onClose}
      footer={null}
      width={900}
      destroyOnHidden
    >
      <div style={{ marginBottom: 16, padding: 12, background: "#fff7e6", border: "1px solid #ffd591", borderRadius: 6 }}>
        <Typography.Text style={{ color: "#d46b08" }}>
          <strong>Lưu ý:</strong> Bạn không có quyền sửa trực tiếp. Các thay đổi sẽ được gửi lên cấp trên để phê duyệt.
        </Typography.Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        onValuesChange={(_, allValues) => setEditedValues(allValues)}
        initialValues={{
          fullName: soldier.fullName,
          citizenId: soldier.citizenId,
          rank: soldier.rank ? soldier.rank.split(" > ") : undefined,
          unit: soldier.unit ? soldier.unit.split(" > ") : undefined,
          position: soldier.position,
          status: soldier.status,
          phone: soldier.phone,
          address: soldier.address,
          gender: soldier.gender,
        }}
      >
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="fullName" label="Họ và tên">
              <Input placeholder="Họ và tên" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="citizenId" label="CCCD/CMND">
              <Input placeholder="CCCD/CMND" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="rank" label="Cấp bậc">
              <Cascader options={RANK_TREE} placeholder="Chọn cấp bậc" displayRender={(labels) => labels[labels.length - 1]} expandTrigger="hover" changeOnSelect />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="unit" label="Đơn vị">
              <Cascader options={UNIT_TREE} placeholder="Chọn đơn vị" displayRender={(labels) => labels[labels.length - 1]} expandTrigger="hover" changeOnSelect />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="position" label="Chức vụ">
              <Select options={POSITIONS.map((p) => ({ label: p, value: p }))} placeholder="Chọn chức vụ" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="status" label="Trạng thái">
              <Select
                options={[
                  { label: "Đang tại ngũ", value: "Active" },
                  { label: "Đang nghỉ phép", value: "On Leave" },
                  { label: "Dự bị", value: "Reserve" },
                  { label: "Đã xuất ngũ", value: "Discharged" },
                ]}
                placeholder="Chọn trạng thái"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="phone" label="Số điện thoại">
              <Input placeholder="Số điện thoại" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="gender" label="Giới tính">
              <Select options={[{ label: "Nam", value: "Nam" }, { label: "Nữ", value: "Nữ" }]} placeholder="Chọn giới tính" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="address" label="Địa chỉ">
          <TextArea rows={2} placeholder="Địa chỉ" />
        </Form.Item>

        <Row gutter={16} style={{ marginTop: 16, justifyContent: "flex-end" }}>
          <Col>
            <Button onClick={onClose}>Huỷ bỏ</Button>
          </Col>
          <Col>
            <Button type="primary" htmlType="submit">
              Gửi đề xuất
            </Button>
          </Col>
        </Row>
      </Form>
    </Modal>
  )
}