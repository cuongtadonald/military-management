/**
 * File: app/api/dashboard/stats/route.ts
 * Mô tả: API tổng hợp dữ liệu cho Dashboard Tổng quan
 * Cập nhật: 2026-07-25
 *
 * GET /api/dashboard/stats?userId=U001
 *   - totals:         { total, active, discharged, pending }
 *   - rankStats:      [{ rankId, name, count }]
 *   - unitStats:      [{ unitId, name, count }]
 *   - monthlySeries:  [{ month, total, recruited, discharged }]
 *
 * Áp dụng phân quyền theo HierarchyPath của user (ADMIN / sd5_admin thấy toàn bộ).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import sql from 'mssql'

// Bảng mã trạng thái quy ước từ hệ thống (khớp W01P0001)
const STATUS_DISCHARGED = 'ST004'

/**
 * Lấy scope của user để build filter theo HierarchyPath.
 */
async function loadUserScope(pool: sql.ConnectionPool, userId: string) {
  const result = await pool.request()
    .input('userId', sql.VarChar, userId)
    .query(`
      SELECT u.UserID, u.UnitID, u.RoleID, u.PermissionLevel,
             ou.HierarchyPath
      FROM [User] u WITH(NOLOCK)
      LEFT JOIN OrganizationUnit ou WITH(NOLOCK) ON u.UnitID = ou.UnitID
      WHERE u.UserID = @userId
    `)

  return result.recordset[0] || null
}

function buildScopeFilter(scope: { RoleID?: string; HierarchyPath?: string | null }) {
  const isAdmin = scope?.RoleID === 'ADMIN' || scope?.RoleID === 'sd5_admin'
  if (isAdmin) return { whereClause: '1 = 1', hierarchyPath: '' }
  return {
    whereClause: 'ou.HierarchyPath LIKE @hierarchyPath',
    hierarchyPath: `${scope?.HierarchyPath || ''}%`,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || ''

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Thiếu UserID' }, { status: 400 })
    }

    const pool = await getPool()

    // Xác định scope người dùng để filter theo HierarchyPath
    const scope = await loadUserScope(pool, userId)
    if (!scope) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy user' }, { status: 404 })
    }

    const { whereClause, hierarchyPath } = buildScopeFilter(scope)

    // ------------------------------------------------------------
    // (1) Tổng hợp KPI: total / active / discharged
    // ------------------------------------------------------------
    const totalsSql = `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN s.StatusID <> @dischargedId OR s.StatusID IS NULL THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN s.StatusID = @dischargedId THEN 1 ELSE 0 END) AS discharged
      FROM Soldier s WITH(NOLOCK)
      LEFT JOIN OrganizationUnit ou WITH(NOLOCK) ON s.UnitID = ou.UnitID
      WHERE ${whereClause}
    `
    const totalsRequest = pool.request().input('dischargedId', sql.VarChar, STATUS_DISCHARGED)
    if (hierarchyPath) totalsRequest.input('hierarchyPath', sql.VarChar, hierarchyPath)
    const totalsResult = await totalsRequest.query(totalsSql)
    const totalsRow = totalsResult.recordset[0] || { total: 0, active: 0, discharged: 0 }

    // ------------------------------------------------------------
    // (2) Số báo cáo chờ xử lý (Permission Request pending)
    //     Chỉ đếm những yêu cầu người dùng có thể nhìn thấy.
    // ------------------------------------------------------------
    let pendingCount = 0
    try {
      const pendingRequest = pool.request().input('userId', sql.VarChar, userId)
      const pendingResult = await pendingRequest.execute('W01P0005')
      const recordsets = pendingResult.recordsets as any
      const rows = recordsets?.[1] || pendingResult.recordset || []
      pendingCount = rows.filter((row: any) => {
        const status = String(row?.StatusID || row?.Status || '').toLowerCase()
        return status === 'pending'
      }).length
    } catch (err) {
      // W01P0005 có thể chưa cấu hình Mode 1 → bỏ qua, giữ pendingCount = 0.
      console.warn('Không lấy được số yêu cầu chờ duyệt:', err)
    }

    // ------------------------------------------------------------
    // (3) Phân bố theo cấp bậc
    // ------------------------------------------------------------
    const rankSql = `
      SELECT r.RankID, r.RankName, COUNT(s.SoldierID) AS Count
      FROM Soldier s WITH(NOLOCK)
      LEFT JOIN OrganizationUnit ou WITH(NOLOCK) ON s.UnitID = ou.UnitID
      LEFT JOIN Rank r WITH(NOLOCK) ON s.RankID = r.RankID
      WHERE (${whereClause})
        AND (s.StatusID <> @dischargedId OR s.StatusID IS NULL)
      GROUP BY r.RankID, r.RankName
      ORDER BY Count DESC
    `
    const rankRequest = pool.request().input('dischargedId', sql.VarChar, STATUS_DISCHARGED)
    if (hierarchyPath) rankRequest.input('hierarchyPath', sql.VarChar, hierarchyPath)
    const rankResult = await rankRequest.query(rankSql)

    // ------------------------------------------------------------
    // (4) Phân bố theo đơn vị (chỉ lấy top-level trực thuộc của user)
    // ------------------------------------------------------------
    const unitSql = `
      SELECT ou.UnitID, ou.UnitName, ou.UnitShortName, COUNT(s.SoldierID) AS Count
      FROM Soldier s WITH(NOLOCK)
      LEFT JOIN OrganizationUnit ou WITH(NOLOCK) ON s.UnitID = ou.UnitID
      WHERE (${whereClause})
        AND (s.StatusID <> @dischargedId OR s.StatusID IS NULL)
      GROUP BY ou.UnitID, ou.UnitName, ou.UnitShortName
      ORDER BY Count DESC
    `
    const unitRequest = pool.request().input('dischargedId', sql.VarChar, STATUS_DISCHARGED)
    if (hierarchyPath) unitRequest.input('hierarchyPath', sql.VarChar, hierarchyPath)
    const unitResult = await unitRequest.query(unitSql)

    // ------------------------------------------------------------
    // (5) Biến động theo tháng (12 tháng gần nhất)
    // ------------------------------------------------------------
    const monthlySql = `
      DECLARE @start DATETIME = DATEADD(MONTH, -11, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))

      ;WITH Months AS (
        SELECT CAST(@start AS DATE) AS MonthStart, 0 AS Idx
        UNION ALL
        SELECT DATEADD(MONTH, 1, MonthStart), Idx + 1 FROM Months WHERE Idx < 11
      ),
      Scope AS (
        SELECT s.SoldierID, s.EnlistmentDate, s.LastModifiedDate, s.StatusID
        FROM Soldier s WITH(NOLOCK)
        LEFT JOIN OrganizationUnit ou WITH(NOLOCK) ON s.UnitID = ou.UnitID
        WHERE ${whereClause}
      )
      SELECT
        FORMAT(m.MonthStart, 'yyyy-MM') AS Month,
        (SELECT COUNT(*) FROM Scope
          WHERE EnlistmentDate IS NULL OR EnlistmentDate <= EOMONTH(m.MonthStart)) AS Total,
        (SELECT COUNT(*) FROM Scope
          WHERE EnlistmentDate BETWEEN m.MonthStart AND EOMONTH(m.MonthStart)) AS Recruited,
        (SELECT COUNT(*) FROM Scope
          WHERE StatusID = @dischargedId
            AND LastModifiedDate BETWEEN m.MonthStart AND EOMONTH(m.MonthStart)) AS Discharged
      FROM Months m
      ORDER BY m.MonthStart
      OPTION (MAXRECURSION 12)
    `
    const monthlyRequest = pool.request().input('dischargedId', sql.VarChar, STATUS_DISCHARGED)
    if (hierarchyPath) monthlyRequest.input('hierarchyPath', sql.VarChar, hierarchyPath)
    const monthlyResult = await monthlyRequest.query(monthlySql)

    // ------------------------------------------------------------
    // Chuẩn hoá payload
    // ------------------------------------------------------------
    const totals = {
      total: Number(totalsRow.total || 0),
      active: Number(totalsRow.active || 0),
      discharged: Number(totalsRow.discharged || 0),
      pending: pendingCount,
    }

    const rankStats = (rankResult.recordset || []).map((row: any) => ({
      rankId: row.RankID || null,
      name: row.RankName || 'Chưa xác định',
      count: Number(row.Count || 0),
    }))

    const unitStats = (unitResult.recordset || []).map((row: any) => ({
      unitId: row.UnitID || null,
      name: row.UnitShortName || row.UnitName || 'Chưa xác định',
      fullName: row.UnitName || null,
      count: Number(row.Count || 0),
    }))

    const monthlySeries = (monthlyResult.recordset || []).map((row: any) => ({
      month: row.Month,
      total: Number(row.Total || 0),
      recruited: Number(row.Recruited || 0),
      discharged: Number(row.Discharged || 0),
    }))

    return NextResponse.json({
      success: true,
      data: { totals, rankStats, unitStats, monthlySeries },
    })
  } catch (error) {
    console.error('Lỗi khi tổng hợp dashboard stats:', error)
    return NextResponse.json(
      { success: false, message: 'Lỗi khi tải dữ liệu tổng quan' },
      { status: 500 }
    )
  }
}
