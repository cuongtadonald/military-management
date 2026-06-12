"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  App,
  Avatar,
  Breadcrumb,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Layout,
  Modal,
  Result,
  Row,
  Space,
  Table,
  Typography,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleFilled,
} from "@ant-design/icons"
import { AppHeader } from "@/components/app-header"
import { StatusTag, RecordTypeTag } from "@/components/status-tag"
import { SoldierForm } from "@/components/soldier-form"
import type { Soldier, SoldierRecord } from "@/lib/soldiers"

const { Content } = Layout

// Nhận prop là 'soldier' và cho phép nó có thể là undefined để xử lý lỗi an toàn
export function SoldierDetail({ soldier }: { soldier: Soldier | undefined }) {
  const router = useRouter()
  const { message } = App.useApp()

  // 1. Nếu không có dữ liệu, hiển thị màn hình 404 thay vì để app bị crash
  if (!soldier) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <AppHeader />
        <Content style={{ padding: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Result
            status="404"
            title="Không tìm thấy thông tin"
            subTitle="Chiến sĩ bạn tìm kiếm không tồn tại hoặc đã bị xoá."
            extra={
              <Button type="primary" onClick={() => router.push("/")}>
                Quay lại danh sách
              </Button>
            }
          />
        </Content>
      </Layout>
    )
  }

  // 2. Sử dụng state để quản lý dữ liệu, giúp giao diện cập nhật ngay khi sửa
  const [currentSoldier, setCurrentSoldier] = useState<Soldier>(soldier)

  // Cập nhật state nếu prop soldier thay đổi (ví dụ: chuyển đổi giữa các ID khác nhau)
  useEffect(() => {
    setCurrentSoldier(soldier)
  }, [soldier])

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  function confirmDelete() {
    message.success(`Đã xoá thông tin của ${currentSoldier.fullName}.`)
    setConfirmOpen(false)
    router.push("/")
  }

  function handleFormSubmit(values: Partial<Soldier>) {
    const updatedSoldier = { ...currentSoldier, ...values } as Soldier
    setCurrentSoldier(updatedSoldier) // Cập nhật state để giao diện thay đổi ngay lập tức
    //message.success("Cập nhật thông tin chiến sĩ thành công!")
    setFormOpen(false)
  }

  const recordColumns: ColumnsType<SoldierRecord> = [
    {
      title: "Tiêu đề",
      dataIndex: "title",
      key: "title",
      render: (t: string) => <span style={{ fontWeight: 600 }}>{t}</span>,
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 130,
      render: (t: string) => <RecordTypeTag type={t} />,
    },
    {
      title: "Ngày",
      dataIndex: "date",
      key: "date",
      width: 130,
      sorter: (a, b) => a.date.localeCompare(b.date),
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      responsive: ["md"],
    },
  ]

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <AppHeader />
      <Content style={{ padding: "16px", maxWidth: 1200, width: "100%", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Breadcrumb
            items={[
              { title: <a onClick={() => router.push("/")}>Trang chủ</a> },
              { title: currentSoldier.fullName },
            ]}
          />
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/")}>
              Quay lại
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => setFormOpen(true)}
            >
              Sửa
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={() => setConfirmOpen(true)}>
              Xoá
            </Button>
          </Space>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={8} lg={7}>
            <Card>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                <Avatar
                  src={currentSoldier.avatar || "/placeholder.svg"}
                  size={120}
                  shape="square"
                  alt={currentSoldier.fullName}
                  style={{ borderRadius: 12, border: "3px solid #eef0e2" }}
                />
                <Typography.Title level={4} style={{ marginTop: 12, marginBottom: 4, color: "#3b4019" }}>
                  {currentSoldier.fullName}
                </Typography.Title>
                <Typography.Text type="secondary">{currentSoldier.rank}</Typography.Text>
                <div style={{ marginTop: 8 }}>
                  <StatusTag status={currentSoldier.status} />
                </div>
                <div style={{ marginTop: 16, width: "100%", textAlign: "left" }}>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Mã chiến sĩ">{currentSoldier.id}</Descriptions.Item>
                    <Descriptions.Item label="Số ID quân đội">{currentSoldier.militaryId}</Descriptions.Item>
                    <Descriptions.Item label="Đơn vị">{currentSoldier.unit}</Descriptions.Item>
                    <Descriptions.Item label="Chức vụ">{currentSoldier.position}</Descriptions.Item>
                  </Descriptions>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} md={16} lg={17}>
            <Space orientation="vertical" size={16} style={{ width: "100%" }}>
              <Card title="Thông tin cá nhân">
                <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
                  <Descriptions.Item label="Họ và tên">{currentSoldier.fullName}</Descriptions.Item>
                  <Descriptions.Item label="Ngày sinh">{currentSoldier.dateOfBirth}</Descriptions.Item>
                  <Descriptions.Item label="Giới tính">{currentSoldier.gender}</Descriptions.Item>
                  <Descriptions.Item label="Số CCCD/CMND">{currentSoldier.citizenId}</Descriptions.Item>
                  <Descriptions.Item label="Quê quán">{currentSoldier.hometown}</Descriptions.Item>
                  <Descriptions.Item label="Dân tộc">{currentSoldier.ethnicity}</Descriptions.Item>
                  <Descriptions.Item label="Tôn giáo">{currentSoldier.religion}</Descriptions.Item>
                  <Descriptions.Item label="Số điện thoại">{currentSoldier.phone}</Descriptions.Item>
                  <Descriptions.Item label="Email">{currentSoldier.email}</Descriptions.Item>
                  <Descriptions.Item label="Địa chỉ" span={2}>
                    {currentSoldier.address}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Card title="Thông tin quân sự">
                <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
                  <Descriptions.Item label="Cấp bậc">{currentSoldier.rank}</Descriptions.Item>
                  <Descriptions.Item label="Đơn vị">{currentSoldier.unit}</Descriptions.Item>
                  <Descriptions.Item label="Chức vụ">{currentSoldier.position}</Descriptions.Item>
                  <Descriptions.Item label="Chuyên môn">{currentSoldier.specialty}</Descriptions.Item>
                  <Descriptions.Item label="Ngày nhập ngũ">{currentSoldier.enlistmentDate}</Descriptions.Item>
                  <Descriptions.Item label="Nhóm máu">{currentSoldier.bloodType}</Descriptions.Item>
                  <Descriptions.Item label="Chính trị">{currentSoldier.politicalStatus}</Descriptions.Item>
                  <Descriptions.Item label="Trình độ">{currentSoldier.education}</Descriptions.Item>
                  <Descriptions.Item label="Trạng thái">
                    <StatusTag status={currentSoldier.status} />
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Card title="Hồ sơ đính kèm">
                {currentSoldier.records.length ? (
                  <Table<SoldierRecord>
                    rowKey="id"
                    columns={recordColumns}
                    dataSource={currentSoldier.records}
                    pagination={false}
                    scroll={{ x: 480 }}
                    size="small"
                  />
                ) : (
                  <Empty description="Chưa có hồ sơ đính kèm" />
                )}
              </Card>
            </Space>
          </Col>
        </Row>
      </Content>

      {/* Modal xác nhận xoá */}
      <Modal
        open={confirmOpen}
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
        onCancel={() => setConfirmOpen(false)}
      >
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          Bạn có chắc chắn muốn xoá thông tin của chiến sĩ <strong>{currentSoldier.fullName}</strong> (
          {currentSoldier.militaryId})? Hành động này không thể hoàn tác.
        </Typography.Paragraph>
      </Modal>

      {/* Modal Form Sửa */}
      <SoldierForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={currentSoldier}
      />
    </Layout>
  )
}