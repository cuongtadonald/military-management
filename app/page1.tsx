/**
 * File: app/page.tsx
 * Mô tả: Trang Tổng quan (Dashboard Overview) - theo thiết kế mới
 */

"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, Col, Layout, Row, Statistic, Typography, Avatar, Badge } from "antd"
import {
  TeamOutlined,
  SafetyCertificateOutlined,
  UserDeleteOutlined,
  FileSearchOutlined,
  UserAddOutlined,
  UploadOutlined,
  BarChartOutlined,
  HistoryOutlined,
  FolderOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons"

import { PageLayout } from "@/components/page-layout"
import { useAuth } from "@/components/auth-provider"
import { useChangeLog } from "@/lib/change-log"

// ============================================================
// INTERFACES
// ============================================================

interface DashboardStats {
  total: number
  active: number
  discharged: number
  pending: number
}

interface RankStat {
  name: string
  count: number
  color: string
}

interface UnitStat {
  name: string
  count: number
  color: string
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function DashboardOverviewPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const { pendingCount } = useChangeLog()

  const [stats, setStats] = useState<DashboardStats>({ total: 0, active: 0, discharged: 0, pending: 0 })
  const [rankStats, setRankStats] = useState<RankStat[]>([])
  const [unitStats, setUnitStats] = useState<UnitStat[]>([])
  const [monthlySeries, setMonthlySeries] = useState<{ month: string; total: number; recruited: number; discharged: number }[]>([])

  // Palette dùng để tô donut/thanh ngang theo thứ tự cố định
  const RANK_PALETTE = ["#1a3a5c", "#2e7d32", "#00796b", "#ef6c00", "#5c6bc0", "#8e24aa", "#6b8e23", "#3a5f3a"]
  const UNIT_PALETTE = ["#2e5c2e", "#4a7c4a", "#1a3a5c", "#6b8e23", "#3a5f3a", "#00796b", "#5c6bc0", "#8e24aa"]

  // Load stats - gọi API tổng hợp mới ở /api/dashboard/stats
  const loadStats = useCallback(async () => {
    if (!user?.userId) return
    try {
      const res = await fetch(`/api/dashboard/stats?userId=${encodeURIComponent(user.userId)}`)
      const result = await res.json()

      if (!result?.success) {
        console.error("API dashboard stats trả về lỗi:", result?.message)
        return
      }

      const { totals, rankStats: apiRanks, unitStats: apiUnits, monthlySeries: apiSeries } = result.data || {}

      setStats({
        total: Number(totals?.total || 0),
        active: Number(totals?.active || 0),
        discharged: Number(totals?.discharged || 0),
        // Ưu tiên số pending do change-log context trả về (đã có real-time),
        // fallback sang giá trị từ API nếu context chưa sẵn sàng.
        pending: pendingCount || Number(totals?.pending || 0),
      })

      // Rank distribution - lấy tối đa 4 dòng đầu, gộp phần còn lại thành "Khác"
      const topRanks = (apiRanks || []).slice(0, 4)
      const otherRanks = (apiRanks || []).slice(4)
      const otherRankCount = otherRanks.reduce((sum: number, r: any) => sum + (r.count || 0), 0)
      const rankItems = topRanks.map((r: any, i: number) => ({ name: r.name, count: r.count, color: RANK_PALETTE[i % RANK_PALETTE.length] }))
      if (otherRankCount > 0) rankItems.push({ name: "Khác", count: otherRankCount, color: RANK_PALETTE[4] })
      setRankStats(rankItems)

      // Unit distribution - tương tự
      const topUnits = (apiUnits || []).slice(0, 4)
      const otherUnits = (apiUnits || []).slice(4)
      const otherUnitCount = otherUnits.reduce((sum: number, u: any) => sum + (u.count || 0), 0)
      const unitItems = topUnits.map((u: any, i: number) => ({ name: u.name, count: u.count, color: UNIT_PALETTE[i % UNIT_PALETTE.length] }))
      if (otherUnitCount > 0) unitItems.push({ name: "Khác", count: otherUnitCount, color: UNIT_PALETTE[4] })
      setUnitStats(unitItems)

      setMonthlySeries(apiSeries || [])
    } catch (error) {
      console.error("Lỗi khi tải thống kê:", error)
    }
  }, [user?.userId, pendingCount])

  useEffect(() => { if (!isLoading && !user) router.replace("/login") }, [user, isLoading, router])
  useEffect(() => { if (!isLoading && user) loadStats() }, [user, isLoading, loadStats])

  // ============================================================
  // GUARD
  // ============================================================

  if (isLoading || !user) {
    return (
      <PageLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400 }}>
          <Typography.Text>Đang kiểm tra phiên đăng nhập...</Typography.Text>
        </div>
      </PageLayout>
    )
  }

  // ============================================================
  // COMPUTED
  // ============================================================

  const activePercent = stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : "0"
  const dischargedPercent = stats.total > 0 ? ((stats.discharged / stats.total) * 100).toFixed(1) : "0"
  const maxUnitCount = Math.max(...unitStats.map(u => u.count), 1)

  // Donut chart calculations
  const totalRank = rankStats.reduce((sum, r) => sum + r.count, 0) || 1

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <PageLayout>
      {/* Welcome Banner */}
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0, color: "#212121" }}>
          Chào mừng trở lại, {user.fullName} 👋
        </Typography.Title>
        <Typography.Text style={{ color: "#757575", fontSize: 14 }}>
          Quản lý và theo dõi thông tin quân nhân một cách hiệu quả
        </Typography.Text>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 10, border: "1px solid #e8e8e8" }} styles={{ body: { padding: "18px 20px" } }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TeamOutlined style={{ fontSize: 22, color: "#2e7d32" }} />
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, color: "#212121", lineHeight: 1.2 }}>{stats.total}</div>
                <div style={{ fontSize: 13, color: "#757575" }}>Tổng quân nhân</div>
                <div style={{ fontSize: 11, color: "#2e7d32" }}>100% tổng số quân nhân</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 10, border: "1px solid #e8e8e8" }} styles={{ body: { padding: "18px 20px" } }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#e3f2fd", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <SafetyCertificateOutlined style={{ fontSize: 22, color: "#1565c0" }} />
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, color: "#212121", lineHeight: 1.2 }}>{stats.active}</div>
                <div style={{ fontSize: 13, color: "#757575" }}>Đang công tác</div>
                <div style={{ fontSize: 11, color: "#1565c0" }}>{activePercent}% tổng quân nhân</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 10, border: "1px solid #e8e8e8" }} styles={{ body: { padding: "18px 20px" } }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#fff3e0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <UserDeleteOutlined style={{ fontSize: 22, color: "#ef6c00" }} />
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, color: "#212121", lineHeight: 1.2 }}>{stats.discharged}</div>
                <div style={{ fontSize: 13, color: "#757575" }}>Đã xuất ngũ</div>
                <div style={{ fontSize: 11, color: "#ef6c00" }}>{dischargedPercent}% tổng quân nhân</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 10, border: "1px solid #e8e8e8" }} styles={{ body: { padding: "18px 20px" } }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#f3e5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileSearchOutlined style={{ fontSize: 22, color: "#7b1fa2" }} />
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, color: "#212121", lineHeight: 1.2 }}>{stats.pending}</div>
                <div style={{ fontSize: 13, color: "#757575" }}>Báo cáo chờ xử lý</div>
                <div style={{ fontSize: 11, color: "#7b1fa2" }}>Chờ xử lý</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Donut Chart - Rank Distribution */}
        <Col xs={24} lg={10}>
          <Card title={<span style={{ fontWeight: 600 }}>Thống kê theo cấp bậc</span>} style={{ borderRadius: 10, height: "100%" }} styles={{ body: { padding: "16px 20px" } }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              {/* CSS Donut */}
              <div style={{ position: "relative", width: 160, height: 160, flexShrink: 0 }}>
                <svg viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
                  {(() => {
                    let offset = 0
                    return rankStats.map((rank, i) => {
                      const pct = (rank.count / totalRank) * 100
                      const circumference = Math.PI * 2 * 35
                      const dashLength = (pct / 100) * circumference
                      const dashOffset = -(offset / 100) * circumference
                      offset += pct
                      return (
                        <circle
                          key={i}
                          cx="50" cy="50" r="35"
                          fill="none"
                          stroke={rank.color}
                          strokeWidth="18"
                          strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                          strokeDashoffset={dashOffset}
                        />
                      )
                    })
                  })()}
                </svg>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#212121" }}>{stats.total}</div>
                  <div style={{ fontSize: 11, color: "#757575" }}>Tổng số</div>
                </div>
              </div>
              {/* Legend */}
              <div style={{ flex: 1 }}>
                {rankStats.map((rank, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: rank.color }} />
                      <span style={{ fontSize: 13, color: "#424242" }}>{rank.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#212121" }}>
                      {rank.count} <span style={{ color: "#757575", fontWeight: 400 }}>({((rank.count / totalRank) * 100).toFixed(1)}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Col>

        {/* Bar Chart - Unit Distribution */}
        <Col xs={24} lg={14}>
          <Card title={<span style={{ fontWeight: 600 }}>Thống kê theo đơn vị</span>} style={{ borderRadius: 10, height: "100%" }} styles={{ body: { padding: "16px 20px" } }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
              {unitStats.map((unit, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "#424242" }}>{unit.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{unit.count}</span>
                  </div>
                  <div style={{ height: 24, background: "#f0f0f0", borderRadius: 6, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(unit.count / maxUnitCount) * 100}%`,
                        background: `linear-gradient(90deg, ${unit.color}, ${unit.color}dd)`,
                        borderRadius: 6,
                        transition: "width 0.5s ease",
                        minWidth: 20,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Line Chart Area + Notifications */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Monthly Fluctuation - simplified line chart */}
        <Col xs={24} lg={14}>
          <Card title={<span style={{ fontWeight: 600 }}>Biến động quân nhân theo tháng</span>} style={{ borderRadius: 10 }} styles={{ body: { padding: "16px 20px" } }}>
            <div style={{ position: "relative", height: 200, borderLeft: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", marginLeft: 30, marginBottom: 30 }}>
              {/* Y axis labels */}
              {[0, 25, 50, 75, 100].map((v, i) => (
                <div key={i} style={{ position: "absolute", left: -30, bottom: `${v}%`, fontSize: 10, color: "#999", transform: "translateY(50%)" }}>
                  {v}
                </div>
              ))}
              {/* X axis labels - dùng dữ liệu real từ monthlySeries */}
              {(monthlySeries.length ? monthlySeries : Array.from({ length: 12 }, (_, i) => ({ month: `2026-${String(i + 1).padStart(2, '0')}` }))).map((row: any, i: number, arr: any[]) => (
                <div key={i} style={{ position: "absolute", left: `${(i / Math.max(arr.length - 1, 1)) * 100}%`, bottom: -22, fontSize: 10, color: "#999", transform: "translateX(-50%)" }}>
                  T{Number((row.month || '').slice(5, 7)) || i + 1}
                </div>
              ))}
              {/* Simple SVG line chart */}
              <svg width="100%" height="100%" viewBox="0 0 1100 200" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                {/* Grid lines */}
                {[0, 50, 100, 150, 200].map((y, i) => (
                  <line key={i} x1="0" y1={y} x2="1100" y2={y} stroke="#f0f0f0" strokeWidth="1" />
                ))}
                {(() => {
                  const series = monthlySeries.length ? monthlySeries : []
                  if (!series.length) return null
                  const maxTotal = Math.max(...series.map(s => s.total), 1)
                  const maxRecruited = Math.max(...series.map(s => s.recruited), 1)
                  const maxDischarged = Math.max(...series.map(s => s.discharged), 1)
                  const yScale = 200
                  const toPoints = (values: number[], max: number) =>
                    values.map((v, i) => {
                      const x = (i / Math.max(series.length - 1, 1)) * 1100
                      const y = yScale - (v / max) * yScale
                      return `${x},${y.toFixed(1)}`
                    }).join(' ')
                  return (
                    <>
                      <polyline fill="none" stroke="#1565c0" strokeWidth="2.5"
                        points={toPoints(series.map(s => s.total), maxTotal)} />
                      <polyline fill="none" stroke="#2e7d32" strokeWidth="2.5"
                        points={toPoints(series.map(s => s.recruited), maxRecruited)} />
                      <polyline fill="none" stroke="#ef6c00" strokeWidth="2.5"
                        points={toPoints(series.map(s => s.discharged), maxDischarged)} />
                    </>
                  )
                })()}
              </svg>
            </div>
            {/* Legend */}
            <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 20, height: 3, background: "#1565c0", borderRadius: 2 }} />
                <span style={{ fontSize: 12, color: "#666" }}>Tổng quân nhân</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 20, height: 3, background: "#2e7d32", borderRadius: 2 }} />
                <span style={{ fontSize: 12, color: "#666" }}>Tuyển mới</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 20, height: 3, background: "#ef6c00", borderRadius: 2 }} />
                <span style={{ fontSize: 12, color: "#666" }}>Xuất ngũ</span>
              </div>
            </div>
          </Card>
        </Col>

        {/* Notifications & Tasks */}
        <Col xs={24} lg={10}>
          <Card title={<span style={{ fontWeight: 600 }}>Thông báo & Công việc</span>} style={{ borderRadius: 10, height: "100%" }} styles={{ body: { padding: "12px 16px" } }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Notification 1 */}
              <div
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, background: "#f9f9f6", border: "1px solid #eee", cursor: "pointer" }}
                onClick={() => router.push("/soldiers")}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <FileSearchOutlined style={{ fontSize: 18, color: "#2e7d32" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#212121" }}>Có {stats.pending} báo cáo chờ duyệt</div>
                  <div style={{ fontSize: 12, color: "#757575" }}>Báo cáo tháng {new Date().toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })}</div>
                </div>
                <div style={{ fontSize: 11, color: "#999", flexShrink: 0 }}>{new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                <ArrowRightOutlined style={{ color: "#bbb", fontSize: 12 }} />
              </div>

              {/* Notification 2 */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, background: "#f9f9f6", border: "1px solid #eee" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#fff3e0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <SyncOutlined style={{ fontSize: 18, color: "#ef6c00" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#212121" }}>Cập nhật thông tin quân nhân</div>
                  <div style={{ fontSize: 12, color: "#757575" }}>Kiểm tra thông tin mới cập nhật</div>
                </div>
                <div style={{ fontSize: 11, color: "#999", flexShrink: 0 }}>{new Date().toLocaleDateString('vi-VN')}</div>
              </div>

              {/* Notification 3 */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, background: "#f9f9f6", border: "1px solid #eee" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#e3f2fd", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <CalendarOutlined style={{ fontSize: 18, color: "#1565c0" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#212121" }}>Lịch khám sức khỏe định kỳ</div>
                  <div style={{ fontSize: 12, color: "#757575" }}>Sắp diễn ra trong tháng {new Date().toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })}</div>
                </div>
                <div style={{ fontSize: 11, color: "#999", flexShrink: 0 }}>{new Date().toLocaleDateString('vi-VN')}</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Quick Action Buttons */}
      <Row gutter={[12, 12]}>
        {[
          { icon: <UserAddOutlined style={{ fontSize: 20, color: "#2e5c2e" }} />, label: "Thêm quân nhân", sub: "Nhập hồ sơ mới", onClick: () => router.push("/soldiers") },
          { icon: <UploadOutlined style={{ fontSize: 20, color: "#2e5c2e" }} />, label: "Nhập Excel", sub: "Import dữ liệu", onClick: () => router.push("/soldiers") },
          { icon: <BarChartOutlined style={{ fontSize: 20, color: "#2e5c2e" }} />, label: "Báo cáo", sub: "Xem báo cáo thống kê", onClick: () => {} },
          { icon: <HistoryOutlined style={{ fontSize: 20, color: "#2e5c2e" }} />, label: "Lịch sử thay đổi", sub: "Theo dõi thay đổi", onClick: () => {} },
          { icon: <FolderOutlined style={{ fontSize: 20, color: "#2e5c2e" }} />, label: "Tài liệu quân lực", sub: "Quản lý tài liệu", onClick: () => {} },
        ].map((item, i) => (
          <Col xs={12} sm={8} md={4} lg={4} key={i} flex={i === 4 ? "auto" : undefined}>
            <Card
              style={{ borderRadius: 10, cursor: "pointer", border: "1px solid #e8e8e8", height: "100%" }}
              styles={{ body: { padding: "14px 16px" } }}
              onClick={item.onClick}
              hoverable
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f0f5f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#212121" }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: "#999" }}>{item.sub}</div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </PageLayout>
  )
}
