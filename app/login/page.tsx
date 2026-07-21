/**
 * File: app/login/page.tsx
 * Mô tả: Trang đăng nhập với validation và error handling
 * Cập nhật: 2026-07-03
 * 
 * Tính năng:
 *   - Form đăng nhập đẹp với logo quân đội
 *   - Background image quân đội (bglogintvc.png)
 *   - Validate username/password
 *   - Hiển thị error message rõ ràng
 *   - Loading state khi đang đăng nhập
 *   - Redirect sau khi đăng nhập thành công
 *   - Hiển thị tài khoản test (chỉ trong dev mode)
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { App, Button, Card, Form, Input, Layout, Typography, Row, Col, Divider, Alert } from "antd"
import { UserOutlined, LockOutlined, LoginOutlined } from "@ant-design/icons"
import { useAuth } from "@/components/auth-provider"

const { Content } = Layout
const { Title, Text } = Typography

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function LoginPage() {
  const router = useRouter()
  const { message } = App.useApp()
  const { login, user, isLoading } = useAuth()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect nếu đã đăng nhập
  useEffect(() => {
    if (!isLoading && user) {
      router.push("/")
    }
  }, [user, isLoading, router])

  // Xử lý đăng nhập
  const handleLogin = async (values: { username: string; password: string }) => {
    try {
      setLoading(true)
      setError(null)
      
      await login(values.username, values.password)
      message.success("Đăng nhập thành công!")
    } catch (error: any) {
      const errorMessage = error.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin."
      setError(errorMessage)
      message.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Fill form nhanh với tài khoản test
  const handleQuickFill = (username: string, password: string) => {
    form.setFieldsValue({ username, password })
  }

  // Hiển thị tài khoản test (chỉ trong dev mode)
  const isDev = process.env.NODE_ENV === 'development'

  return (
    <Layout style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Background Image quân đội */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(/bglogintvc.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          zIndex: 0,
        }}
      />
      
      {/* Overlay để đảm bảo form dễ đọc */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.3)",
          zIndex: 1,
        }}
      />

      <Content 
        style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          padding: 24,
          position: "relative",
          zIndex: 2,
        }}
      >
        <Card 
          style={{ 
            width: 420, 
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            borderRadius: "12px",
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(10px)",
          }}
        >
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div
              style={{
                display: "inline-block",
                padding: "12px",
                background: "linear-gradient(135deg, #4b5320 0%, #6b7330 100%)",
                borderRadius: "50%",
                marginBottom: 16,
                boxShadow: "0 4px 12px rgba(75, 83, 32, 0.3)",
              }}
            >
              <img
                src="/logovn.jpg"
                alt="Logo"
                style={{ width: 80, height: 80, borderRadius: "50%" }}
              />
            </div>
            <Title level={2} style={{ margin: 0, color: "#4b5320" }}>
              Hồ sơ quân nhân
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Hệ thống quản lý thông tin quân nhân
            </Text>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert
              title="Đăng nhập thất bại"
              description={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
              style={{ marginBottom: 24 }}
            />
          )}

          {/* Login Form */}
          <Form
            form={form}
            layout="vertical"
            onFinish={handleLogin}
            autoComplete="off"
          >
            <Form.Item
              name="username"
              label="Tên đăng nhập"
              rules={[
                { required: true, message: "Vui lòng nhập tên đăng nhập" },
                { min: 3, message: "Tên đăng nhập phải có ít nhất 3 ký tự" },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: "#8c8c8c" }} />}
                placeholder="Nhập tên đăng nhập"
                size="large"
                disabled={loading}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[
                { required: true, message: "Vui lòng nhập mật khẩu" },
                { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#8c8c8c" }} />}
                placeholder="Nhập mật khẩu"
                size="large"
                disabled={loading}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                htmlType="submit"
                icon={<LoginOutlined />}
                size="large"
                block
                loading={loading}
                style={{ 
                  background: "linear-gradient(135deg, #4b5320 0%, #6b7330 100%)",
                  borderColor: "#4b5320",
                  height: "48px",
                  fontSize: "16px",
                  fontWeight: 600,
                }}
              >
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>

          {/* Tài khoản test (chỉ hiện trong dev mode) */}
          {isDev && (
            <>
              <Divider plain style={{ color: "#8c8c8c", fontSize: 12 }}>
                Tài khoản test
              </Divider>
              
              <Row gutter={[8, 8]}>
                <Col span={24}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Nhấn để điền nhanh:
                  </Text>
                </Col>
                {/* <Col span={12}>
                  <Button
                    size="small"
                    block
                    onClick={() => handleQuickFill("admin", "123456")}
                    disabled={loading}
                  >
                    Admin
                  </Button>
                </Col> */}
                <Col span={12}>
                  <Button
                    size="small"
                    block
                    onClick={() => handleQuickFill("sd5_admin", "123456")}
                    disabled={loading}
                  >
                    Sư đoàn 5
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    size="small"
                    block
                    onClick={() => handleQuickFill("tr4_manager", "123456")}
                    disabled={loading}
                  >
                    Trung đoàn 4
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    size="small"
                    block
                    onClick={() => handleQuickFill("eBB5", "123456")}
                    disabled={loading}
                  >
                    Trung đoàn 5
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    size="small"
                    block
                    onClick={() => handleQuickFill("trd_4", "123456")}
                    disabled={loading}
                  >
                    Tiểu đoàn Bộ binh 4
                  </Button>
                </Col>
              </Row>
            </>
          )}
        </Card>
      </Content>
    </Layout>
  )
}