/**
 * File: app/login/page.tsx
 * Mô tả: Trang đăng nhập - ảnh nền full màn hình, các element overlay lên trên
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { App, Button, Checkbox, Form, Input, Typography, Alert } from "antd"
import {
  UserOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  BarChartOutlined,
  ApiOutlined,
  PhoneOutlined,
  BookOutlined,
  MailOutlined,
  StarFilled,
  KeyOutlined,
} from "@ant-design/icons"
import { useAuth } from "@/components/auth-provider"

const { Title, Text } = Typography

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */

interface FeatureItemProps {
  icon: React.ReactNode
  title: string
  desc: string
}

function FeatureItem({ icon, title, desc }: FeatureItemProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.12)",
        border: "1px solid rgba(255,255,255,0.2)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "rgba(46,125,50,0.18)",
          border: "1px solid rgba(46,125,50,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#2e7d32",
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ color: "#2e7d32", fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>
          {title}
        </div>
        <div style={{ color: "rgba(46,125,50,0.8)", fontSize: 11, lineHeight: 1.4, marginTop: 1 }}>
          {desc}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function LoginPage() {
  const router = useRouter()
  const { message } = App.useApp()
  const { login, user, isLoading } = useAuth()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/")
    }
  }, [user, isLoading, router])

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

  const handleQuickFill = (username: string, password: string) => {
    form.setFieldsValue({ username, password })
  }

  const quickAccounts = [
    { label: "Sư đoàn 5", username: "sd5_admin", iconColor: "#c62828", iconBg: "#fff3e0" },
    { label: "Trung đoàn 4", username: "tr4_manager", iconColor: "#2e7d32", iconBg: "#e8f5e9" },
    { label: "Trung đoàn 5", username: "eBB5", iconColor: "#1565c0", iconBg: "#e3f2fd" },
    { label: "Tiểu đoàn BB 4", username: "trd_4", iconColor: "#c62828", iconBg: "#fce4ec" },
  ]

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        fontFamily: "'Inter', 'Roboto', sans-serif",
      }}
    >
      {/* ====== FULL-SCREEN BACKGROUND IMAGE ====== */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(/login-hero.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Subtle dark overlay for readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(90deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.1) 100%)",
          zIndex: 1,
        }}
      />

      {/* ====== MAIN CONTENT ROW: features + login card ======
          Total width: 260 + 20 + 480 = 760px
          Right edge of card at 100px from screen right
      */}
      <div
        className="login-main-row"
        style={{
          position: "absolute",
          zIndex: 10,
          top: "46%",
          right: 100,
          transform: "translateY(-50%)",
          display: "flex",
          alignItems: "flex-start",
          gap: 20,
        }}
      >
        {/* --- 4 FEATURE BOXES --- */}
        <div
          className="login-features"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            width: 260,
            flexShrink: 0,
            marginTop: 100,
          }}
        >
          <FeatureItem
            icon={<SafetyCertificateOutlined />}
            title="BẢO MẬT TUYỆT ĐỐI"
            desc="Mã hoá dữ liệu theo tiêu chuẩn quân sự"
          />
          <FeatureItem
            icon={<TeamOutlined />}
            title="QUẢN LÝ HIỆU QUẢ"
            desc="Quản lý hồ sơ quân nhân tập trung"
          />
          <FeatureItem
            icon={<BarChartOutlined />}
            title="BÁO CÁO THỐNG KÊ"
            desc="Thống kê, cảnh báo và nhắc lịch tự động"
          />
          <FeatureItem
            icon={<ApiOutlined />}
            title="KẾT NỐI LIÊN THÔNG"
            desc="Liên thông dữ liệu giữa các đơn vị"
          />
        </div>

        {/* --- LOGIN CARD --- */}
        <div
          className="login-card-wrapper"
          style={{
            width: 480,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.97)",
              borderRadius: 20,
              padding: "28px 32px 24px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.1)",
              backdropFilter: "blur(12px)",
            }}
          >
            {/* Header with logo */}
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 68,
                  height: 68,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #2e5c2e 0%, #1a3a1a 100%)",
                  boxShadow: "0 4px 16px rgba(46,92,46,0.3)",
                  marginBottom: 10,
                  border: "3px solid #d4a843",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logovn.jpg"
                  alt="Logo"
                  style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }}
                />
              </div>
              <Title
                level={3}
                style={{ margin: 0, color: "#1a3a1a", letterSpacing: 1.5, fontWeight: 800, fontSize: 20 }}
              >
                HỒ SƠ QUÂN NHÂN
              </Title>
              <Text style={{ color: "#6b7b6b", fontSize: 12, marginTop: 2, display: "block" }}>
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
                style={{ marginBottom: 12 }}
              />
            )}

            {/* Login Form */}
            <Form form={form} layout="vertical" onFinish={handleLogin} autoComplete="off" requiredMark={false}>
              <Form.Item
                name="username"
                label={<span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>Tên đăng nhập</span>}
                rules={[
                  { required: true, message: "Vui lòng nhập tên đăng nhập" },
                  { min: 3, message: "Tên đăng nhập phải có ít nhất 3 ký tự" },
                ]}
                style={{ marginBottom: 12 }}
              >
                <Input
                  prefix={<UserOutlined style={{ color: "#8c8c8c", fontSize: 15 }} />}
                  placeholder="Nhập tên đăng nhập"
                  size="large"
                  disabled={loading}
                  style={{ borderRadius: 10, height: 44 }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>Mật khẩu</span>}
                rules={[
                  { required: true, message: "Vui lòng nhập mật khẩu" },
                  { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
                ]}
                style={{ marginBottom: 8 }}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "#8c8c8c", fontSize: 15 }} />}
                  placeholder="Nhập mật khẩu"
                  size="large"
                  disabled={loading}
                  style={{ borderRadius: 10, height: 44 }}
                />
              </Form.Item>

              {/* Remember + Forgot password */}
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
                  icon={<KeyOutlined />}
                  size="large"
                  block
                  loading={loading}
                  style={{
                    background: "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)",
                    borderColor: "#2e7d32",
                    height: 46,
                    fontSize: 15,
                    fontWeight: 700,
                    borderRadius: 10,
                    letterSpacing: 1.5,
                  }}
                >
                  ĐĂNG NHẬP
                </Button>
              </Form.Item>
            </Form>

            {/* Quick login section */}
            <div style={{ marginTop: 10 }}>
              <div style={{ textAlign: "center", marginBottom: 12, position: "relative" }}>
                <div style={{ borderTop: "1px solid #e8e8e8", position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      top: -10,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "#fff",
                      padding: "0 14px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#8c8c8c",
                      letterSpacing: 1,
                    }}
                  >
                    HOẶC ĐĂNG NHẬP NHANH
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {quickAccounts.map((acc) => (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => handleQuickFill(acc.username, "123456")}
                    disabled={loading}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 12px",
                      border: "1px solid #e8e8e0",
                      borderRadius: 10,
                      background: "#fafaf7",
                      cursor: loading ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      fontSize: 12.5,
                      fontWeight: 500,
                      color: "#333",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.background = "#f0f5ec"
                        e.currentTarget.style.borderColor = "#b5d4b5"
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.background = "#fafaf7"
                        e.currentTarget.style.borderColor = "#e8e8e0"
                      }
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: acc.iconBg,
                        border: `1.5px solid ${acc.iconColor}30`,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: acc.iconColor,
                        fontSize: 12,
                        fontWeight: 800,
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
        </div>
      </div>

      {/* ====== SLOGAN BOX - bottom left, glass effect ====== */}
      <div
        className="login-slogan"
        style={{
          position: "absolute",
          zIndex: 10,
          bottom: 76,
          left: 40,
          padding: "16px 24px 14px",
          borderRadius: 14,
          background: "rgba(20,40,20,0.45)",
          border: "1px solid rgba(212,168,67,0.35)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          textAlign: "center",
          minWidth: 240,
        }}
      >
        {/* Star icon + text */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center" }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "rgba(212,168,67,0.2)",
              border: "1.5px solid rgba(212,168,67,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <StarFilled style={{ color: "#f4d47c", fontSize: 17 }} />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#f4d47c", fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
              ĐOÀN KẾT TRUNG DŨNG – CƠ ĐỘNG LINH HOẠT

            </div>
            <div style={{ color: "#f4d47c", fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
              TỰ LỰC TỰ CƯỜNG – ĐÁNH THẮNG MỌI KẺ THÙ
            </div>
          </div>
        </div>
        {/* 3 stars with lines on both sides */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: 10,
          }}
        >
          <div style={{ flex: 1, height: 1, background: "rgba(212,168,67,0.4)" }} />
          <div style={{ display: "flex", gap: 5 }}>
            <StarFilled style={{ color: "#f4d47c", fontSize: 8 }} />
            <StarFilled style={{ color: "#f4d47c", fontSize: 8 }} />
            <StarFilled style={{ color: "#f4d47c", fontSize: 8 }} />
          </div>
          <div style={{ flex: 1, height: 1, background: "rgba(212,168,67,0.4)" }} />
        </div>
      </div>

      {/* ====== FOOTER BAR - below login card, glass effect ======
          Width = features(260) + gap(20) + card(480) = 760px
          Aligned with main content row (right: 100)
      */}
      <div
        className="login-footer"
        style={{
          position: "absolute",
          zIndex: 10,
          bottom: 20,
          right: 100,
          width: 760,
          background: "rgba(20,40,20,0.4)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 14,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          padding: "10px 24px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 20,
        }}
      >
        {/* Footer item 1 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(212,168,67,0.15)",
              border: "1px solid rgba(212,168,67,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f4d47c",
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            <PhoneOutlined />
          </div>
          <div>
            <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>Hỗ trợ 24/7</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>Đội ngũ luôn sẵn sàng hỗ trợ</div>
          </div>
        </div>

        {/* Footer item 2 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(212,168,67,0.15)",
              border: "1px solid rgba(212,168,67,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f4d47c",
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            <BookOutlined />
          </div>
          <div>
            <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>Hướng dẫn sử dụng</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>Tài liệu và hướng dẫn chi tiết</div>
          </div>
        </div>

        {/* Footer item 3 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(212,168,67,0.15)",
              border: "1px solid rgba(212,168,67,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f4d47c",
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            <MailOutlined />
          </div>
          <div>
            <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>Liên hệ quản trị</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>quantri@hsqn.mil.vn</div>
          </div>
        </div>
      </div>

      {/* ====== RESPONSIVE ====== */}
      <style jsx>{`
        @media (max-width: 1100px) {
          :global(.login-main-row) {
            gap: 16px !important;
          }
          :global(.login-features) {
            width: 220px !important;
          }
          :global(.login-card-wrapper) {
            width: 420px !important;
          }
          :global(.login-footer) {
            width: 660px !important;
          }
        }
        @media (max-width: 768px) {
          :global(.login-main-row) {
            flex-direction: column !important;
            align-items: center !important;
            top: 50% !important;
            gap: 16px !important;
          }
          :global(.login-features) {
            width: 100% !important;
            max-width: 400px !important;
          }
          :global(.login-card-wrapper) {
            width: 100% !important;
            max-width: 400px !important;
          }
          :global(.login-slogan) {
            display: none !important;
          }
          :global(.login-footer) {
            width: calc(100% - 40px) !important;
          }
        }
      `}</style>
    </div>
  )
}