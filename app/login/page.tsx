/**
 * File: app/login/page.tsx
 * Mô tả: Trang đăng nhập - thiết kế mới (hero trái + card đăng nhập phải)
 * Cập nhật: 2026-07-27
 *
 * Layout theo mockup:
 *   - Cột trái: ảnh bìa quân đội + tiêu đề + 4 tính năng nổi bật + slogan "Kỷ luật - Đồng tâm..."
 *   - Cột phải: card đăng nhập với logo tròn, form user/pass, ghi nhớ, quên mật khẩu, 4 nút chọn nhanh đơn vị
 *   - Chân trang: 3 khối liên hệ (hỗ trợ 24/7 / hướng dẫn / email)
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { App, Button, Checkbox, Form, Input, Typography, Alert } from "antd"
import {
  UserOutlined,
  LockOutlined,
  LoginOutlined,
  SafetyCertificateOutlined,
  LockFilled,
  BellOutlined,
  ApiOutlined,
  PhoneOutlined,
  BookOutlined,
  MailOutlined,
  StarFilled,
} from "@ant-design/icons"
import { useAuth } from "@/components/auth-provider"

const { Title, Text } = Typography

// ============================================================
// SUB-COMPONENTS
// ============================================================

interface FeatureItemProps {
  icon: React.ReactNode
  title: string
  desc: string
}

function FeatureItem({ icon, title, desc }: FeatureItemProps) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#f4d47c",
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{title}</div>
        <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  )
}

interface FooterItemProps {
  icon: React.ReactNode
  title: string
  desc: string
}

function FooterItem({ icon, title, desc }: FooterItemProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)",
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: "rgba(212,168,67,0.15)",
          border: "1px solid rgba(212,168,67,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#f4d47c",
          fontSize: 15,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{title}</div>
        <div
          style={{
            color: "rgba(255,255,255,0.65)",
            fontSize: 11,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  )
}

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
    } catch (err: any) {
      const errorMessage = err?.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin."
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

  const quickAccounts = [
    { label: "Sư đoàn 5", username: "sd5_admin", color: "#2e7d32" },
    { label: "Trung đoàn 4", username: "tr4_manager", color: "#1565c0" },
    { label: "Trung đoàn 5", username: "eBB5", color: "#c62828" },
    { label: "Tiểu đoàn Bộ binh 4", username: "trd_4", color: "#6a1b9a" },
  ]

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f1d10 0%, #172a19 45%, #223a25 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative background glow */}
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -120,
          width: 380,
          height: 380,
          background: "radial-gradient(circle, rgba(212,168,67,0.18) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -160,
          left: -120,
          width: 420,
          height: 420,
          background: "radial-gradient(circle, rgba(46,125,50,0.25) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />

      {/* Main container */}
      <div
        style={{
          width: "100%",
          maxWidth: 1180,
          background: "rgba(20,32,22,0.55)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding: 24,
          backdropFilter: "blur(12px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)",
            gap: 24,
            alignItems: "stretch",
          }}
          className="login-grid"
        >
          {/* =================== LEFT COLUMN =================== */}
          <div
            style={{
              position: "relative",
              borderRadius: 14,
              overflow: "hidden",
              minHeight: 560,
              backgroundImage: `linear-gradient(180deg, rgba(15,29,16,0.35) 0%, rgba(15,29,16,0.85) 100%), url(/login-hero.png)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "28px 26px",
            }}
          >
            {/* Feature list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
              <FeatureItem
                icon={<SafetyCertificateOutlined />}
                title="Bảo mật tuyệt đối"
                desc="Mã hoá dữ liệu theo tiêu chuẩn quân sự"
              />
              <FeatureItem
                icon={<LockFilled />}
                title="Bảo mật 2 lớp"
                desc="Xác thực nhiều bước cho tài khoản"
              />
              <FeatureItem
                icon={<BellOutlined />}
                title="Báo cáo thông minh"
                desc="Thống kê, cảnh báo và nhắc lịch tự động"
              />
              <FeatureItem
                icon={<ApiOutlined />}
                title="Kết nối đồng bộ"
                desc="Liên thông dữ liệu giữa các đơn vị"
              />
            </div>

            {/* Slogan */}
            <div
              style={{
                marginTop: 24,
                padding: "16px 18px",
                borderRadius: 12,
                background: "linear-gradient(135deg, rgba(30,60,30,0.85) 0%, rgba(15,30,15,0.9) 100%)",
                border: "1px solid rgba(212,168,67,0.35)",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <StarFilled style={{ color: "#f4d47c", fontSize: 22 }} />
              <div>
                <div style={{ color: "#f4d47c", fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>
                  KỶ LUẬT – ĐỒNG TÂM
                </div>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>
                  SẴN SÀNG – CHIẾN THẮNG
                </div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                <StarFilled style={{ color: "#f4d47c", fontSize: 10 }} />
                <StarFilled style={{ color: "#f4d47c", fontSize: 10 }} />
                <StarFilled style={{ color: "#f4d47c", fontSize: 10 }} />
              </div>
            </div>
          </div>

          {/* =================== RIGHT COLUMN =================== */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {/* Login card */}
            <div
              style={{
                background: "rgba(255,255,255,0.97)",
                borderRadius: 14,
                padding: "28px 28px 22px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
              }}
            >
              {/* Header với logo tròn */}
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 78,
                    height: 78,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #2e5c2e 0%, #1a3a1a 100%)",
                    boxShadow: "0 4px 14px rgba(46,92,46,0.35)",
                    marginBottom: 12,
                    border: "3px solid #d4a843",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logovn.jpg"
                    alt="Logo"
                    style={{ width: 58, height: 58, borderRadius: "50%", objectFit: "cover" }}
                  />
                </div>
                <Title
                  level={3}
                  style={{ margin: 0, color: "#1a3a1a", letterSpacing: 1, fontWeight: 800 }}
                >
                  HỒ SƠ QUÂN NHÂN
                </Title>
                <Text style={{ color: "#5c6b5c", fontSize: 13 }}>
                  Hệ thống quản lý thông tin quân nhân
                </Text>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert
                  message={error}
                  type="error"
                  showIcon
                  closable
                  onClose={() => setError(null)}
                  style={{ marginBottom: 16 }}
                />
              )}

              {/* Login Form */}
              <Form form={form} layout="vertical" onFinish={handleLogin} autoComplete="off" requiredMark={false}>
                <Form.Item
                  name="username"
                  label={<span style={{ fontSize: 13, fontWeight: 500, color: "#333" }}>Tên đăng nhập</span>}
                  rules={[
                    { required: true, message: "Vui lòng nhập tên đăng nhập" },
                    { min: 3, message: "Tên đăng nhập phải có ít nhất 3 ký tự" },
                  ]}
                  style={{ marginBottom: 14 }}
                >
                  <Input
                    prefix={<UserOutlined style={{ color: "#8c8c8c" }} />}
                    placeholder="Nhập tên đăng nhập"
                    size="large"
                    disabled={loading}
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label={<span style={{ fontSize: 13, fontWeight: 500, color: "#333" }}>Mật khẩu</span>}
                  rules={[
                    { required: true, message: "Vui lòng nhập mật khẩu" },
                    { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
                  ]}
                  style={{ marginBottom: 10 }}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: "#8c8c8c" }} />}
                    placeholder="Nhập mật khẩu"
                    size="large"
                    disabled={loading}
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>

                {/* Ghi nhớ + quên mật khẩu */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <Form.Item name="remember" valuePropName="checked" noStyle initialValue>
                    <Checkbox style={{ fontSize: 13 }}>Ghi nhớ đăng nhập</Checkbox>
                  </Form.Item>
                  <a style={{ fontSize: 13, color: "#2e7d32", fontWeight: 500 }} href="#">
                    Quên mật khẩu?
                  </a>
                </div>

                <Form.Item style={{ marginBottom: 8 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<LoginOutlined />}
                    size="large"
                    block
                    loading={loading}
                    style={{
                      background: "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)",
                      borderColor: "#2e7d32",
                      height: 46,
                      fontSize: 15,
                      fontWeight: 600,
                      borderRadius: 8,
                      letterSpacing: 1,
                    }}
                  >
                    ĐĂNG NHẬP
                  </Button>
                </Form.Item>
              </Form>

              {/* Quick accounts */}
              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  {quickAccounts.map((acc) => (
                    <button
                      key={acc.username}
                      type="button"
                      onClick={() => handleQuickFill(acc.username, "123456")}
                      disabled={loading}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 12px",
                        border: "1px solid #e6e6e0",
                        borderRadius: 10,
                        background: "#fafaf5",
                        cursor: loading ? "not-allowed" : "pointer",
                        transition: "all 0.15s",
                        fontSize: 13,
                        color: "#333",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) e.currentTarget.style.background = "#f0f5ec"
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) e.currentTarget.style.background = "#fafaf5"
                      }}
                    >
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: acc.color,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {acc.label.charAt(0)}
                      </span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {acc.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer contacts */}
            <div style={{ display: "flex", gap: 10 }}>
              <FooterItem icon={<PhoneOutlined />} title="Hỗ trợ 24/7" desc="1900 xxx xxx" />
              <FooterItem icon={<BookOutlined />} title="Hướng dẫn sử dụng" desc="Xem tài liệu" />
              <FooterItem icon={<MailOutlined />} title="Email" desc="support@hsqn.vn" />
            </div>
          </div>
        </div>
      </div>

      {/* Responsive: mobile stack */}
      <style jsx>{`
        @media (max-width: 900px) {
          :global(.login-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
