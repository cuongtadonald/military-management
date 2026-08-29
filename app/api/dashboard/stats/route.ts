/**
 * File: app/api/dashboard/stats/route.ts
 * Mô tả: API tổng hợp dữ liệu cho Dashboard Tổng quan
 * Cập nhật: 2026-08-28 - Gọi W00P0001 với Mode 0, 1, 2
 *
 * GET /api/dashboard/stats?userId=U001
 *   - totals:         { total, working, active, discharged, retired, studying }
 *   - rankStats:      [{ rankId, name, count }]
 *   - unitStats:      [{ unitId, name, count }]
 *
 * Áp dụng phân quyền theo UnitID của user.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import sql from 'mssql'

/**
 * Lấy thông tin user (UnitID, RoleID) để xác định scope.
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || ''

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Thiếu UserID' }, { status: 400 })
    }

    const pool = await getPool()

    // Xác định scope người dùng
    const scope = await loadUserScope(pool, userId)
    if (!scope) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy user' }, { status: 404 })
    }

    const userUnitId = scope.UnitID || ''

    // ------------------------------------------------------------
    // (1) Mode 0: Thống kê tổng quan
    // ------------------------------------------------------------
    const mode0Result = await pool.request()
      .input('Mode', sql.Int, 0)
      .execute('W00P0001')
    const mode0Row = mode0Result.recordset[0] || {}

    const totals = {
      total: Number(mode0Row.TotalSoldier || 0),
      working: Number(mode0Row.WorkingSoldier || 0),
      active: Number(mode0Row.ActiveSoldier || 0),
      discharged: Number(mode0Row.DischargedSoldier || 0),
      retired: Number(mode0Row.RetiredSoldier || 0),
      studying: Number(mode0Row.StudyingSoldier || 0),
    }

    // ------------------------------------------------------------
    // (2) Mode 1: Thống kê theo cấp bậc
    // ------------------------------------------------------------
    const mode1Result = await pool.request()
      .input('Mode', sql.Int, 1)
      .execute('W00P0001')
    const rankStats = (mode1Result.recordset || []).map((row: any) => ({
      rankId: row.RankID || null,
      name: row.RankName || 'Chưa xác định',
      count: Number(row.Total || 0),
    }))

    // ------------------------------------------------------------
    // (3) Mode 2: Thống kê quân số theo đơn vị con
    // ------------------------------------------------------------
    const mode2Result = await pool.request()
      .input('Mode', sql.Int, 2)
      .input('UnitID', sql.VarChar, userUnitId)
      .execute('W00P0001')
    const mode2Rows = mode2Result.recordset || []

    // Lấy FullPathName + tên đơn vị cha của user để hiển thị breadcrumb
    let userUnitName = ''
    const unitPathMap = new Map<string, string>()
    if (mode2Rows.length > 0 && userUnitId) {
      try {
        const parentResult = await pool.request()
          .input('unitId', sql.VarChar, userUnitId)
          .query(`
            SELECT UnitName, FullPathName
            FROM OrganizationUnit WITH(NOLOCK)
            WHERE UnitID = @unitId
          `)
        userUnitName = parentResult.recordset[0]?.UnitName || ''
      } catch {}

      const childIds = mode2Rows.map((r: any) => `'${r.UnitID}'`).join(',')
      if (childIds) {
        try {
          const pathResult = await pool.request()
            .query(`
              SELECT UnitID, FullPathName
              FROM OrganizationUnit WITH(NOLOCK)
              WHERE UnitID IN (${childIds})
            `)
          pathResult.recordset.forEach((r: any) => {
            unitPathMap.set(r.UnitID, r.FullPathName || '')
          })
        } catch {}
      }
    }

    const unitStats = mode2Rows.map((row: any) => ({
      unitId: row.UnitID || null,
      name: row.UnitName || 'Chưa xác định',
      fullPathName: unitPathMap.get(row.UnitID) || (userUnitName ? `${userUnitName} > ${row.UnitName}` : row.UnitName || 'Chưa xác định'),
      count: Number(row.TotalSoldier || 0),
    }))

    // ------------------------------------------------------------
    // (4) Số báo cáo chờ xử lý (Permission Request pending)
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
      console.warn('Không lấy được số yêu cầu chờ duyệt:', err)
    }

    return NextResponse.json({
      success: true,
      data: { totals, rankStats, unitStats, pending: pendingCount },
    })
  } catch (error) {
    console.error('Lỗi khi tổng hợp dashboard stats:', error)
    return NextResponse.json(
      { success: false, message: 'Lỗi khi tải dữ liệu tổng quan' },
      { status: 500 }
    )
  }
}
