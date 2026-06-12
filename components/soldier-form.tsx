"use client"

import { useEffect } from "react"
import { App, Button, Col, Form, Input, Modal, Row, Select } from "antd"
import type { Soldier } from "@/lib/soldiers"
import { RANKS, UNITS, POSITIONS } from "@/lib/soldiers"

const { TextArea } = Input

interface SoldierFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: Partial<Soldier>) => void
  initialData?: Soldier | null
}

export function SoldierForm({ open, onClose, onSubmit, initialData }: SoldierFormProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm()

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue({
          ...initialData,
        })
      } else {
        form.resetFields()
      }
    }
  }, [open, initialData, form])

  const handleFinish = (values: any) => {
    onSubmit(values)
    message.success(initialData ? "Cập nhật thông tin thành công!" : "Thêm mới thông tin thành công!")
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      open={open}
      title={initialData ? "Sửa hồ sơ" : "Thêm mới hồ sơ"}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          status: "Active",
          gender: "Male",
        }}
      >
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="fullName"
              label="Họ và tên"
              rules={[{ required: true, message: "Hãy điền đầy đủ Họ và Tên!" }]}
            >
              <Input placeholder="e.g., John Doe" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="militaryId"
              label="Mã quân đội"
              rules={[{ required: true, message: "Please input military ID!" }]}
            >
              <Input placeholder="e.g., MIL-123456" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="rank"
              label="Cấp bậc"
              rules={[{ required: true, message: "Hãy chọn cấp bậc!" }]}
            >
              <Select options={RANKS.map((r) => ({ label: r, value: r }))} placeholder="Chọn cấp bậc" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="unit"
              label="Đơn vị"
              rules={[{ required: true, message: "Hãy chọn đơn vị!" }]}
            >
              <Select options={UNITS.map((u) => ({ label: u, value: u }))} placeholder="Chọn đơn vị" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="position"
              label="Chức vụ"
              rules={[{ required: true, message: "Hãy chọn chức vụ!" }]}
            >
              <Select options={POSITIONS.map((p) => ({ label: p, value: p }))} placeholder="Chọn chức vụ" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="status"
              label="Trạng thái"
              rules={[{ required: true, message: "Hãy chọn trạng thái!" }]}
            >
              <Select
                options={[
                  { label: "Active", value: "Active" },
                  { label: "On Leave", value: "On Leave" },
                  { label: "Reserve", value: "Reserve" },
                  { label: "Discharged", value: "Discharged" },
                ]}
                placeholder="Chọn trạng thái"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="phone"
              label="Số điện thoại"
              rules={[{ required: true, message: "Please input phone number!" }]}
            >
              <Input placeholder="vd: 0378051353" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Hãy nhập Email!" },
                { type: "email", message: "Vui lòng nhập đúng định dạng Email!" },
              ]}
            >
              <Input placeholder="vd: quannhan1@qdnd.vn" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="address"
          label="Địa chỉ"
          rules={[{ required: true, message: "Hãy nhập địa chỉ!" }]}
        >
          <TextArea rows={2} placeholder="Địa chỉ đầy đủ" />
        </Form.Item>

        <Row gutter={16} style={{ marginTop: 16, justifyContent: "flex-end" }}>
          <Col>
            <Button onClick={onClose}>Huỷ</Button>
          </Col>
          <Col>
            <Button type="primary" htmlType="submit">
              {initialData ? "Cập nhật" : "Thêm"} chiến sĩ
            </Button>
          </Col>
        </Row>
      </Form>
    </Modal>
  )
}