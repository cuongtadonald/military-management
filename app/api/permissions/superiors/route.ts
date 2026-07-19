import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import sql from 'mssql'
import { getUserScope } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || ''

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Thiếu UserID' }, { status: 400 })
    }

    const pool = await getPool()
    const scope = await getUserScope(pool, userId)
    if (!scope?.HierarchyPath) {
      return NextResponse.json({ success: true, data: [] })
    }

    const pathIds = String(scope.HierarchyPath)
      .split('/')
      .map((id) => id.trim())
      .filter(Boolean)
      .filter((id) => id !== scope.UnitID)

    if (pathIds.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const result = await pool.request()
      .input('UnitIds', sql.NVarChar, pathIds.join(','))
      .input('CurrentPermissionLevel', sql.Int, scope.PermissionLevel ?? 99)
      .query(`
        SELECT
          u.UserID,
          u.Username,
          u.FullName,
          u.RoleID,
          r.RoleName,
          u.PermissionLevel,
          u.UnitID,
          ou.UnitName,
          ou.FullPathName AS UnitFullPath
        FROM [User] u
        LEFT JOIN Role r ON u.RoleID = r.RoleID
        INNER JOIN OrganizationUnit ou ON u.UnitID = ou.UnitID
        WHERE u.UnitID IN (SELECT value FROM STRING_SPLIT(@UnitIds, ','))
          AND ISNULL(u.PermissionLevel, 99) < @CurrentPermissionLevel
        ORDER BY u.PermissionLevel, ou.UnitLevel, u.FullName
      `)

    return NextResponse.json({ success: true, data: result.recordset })
  } catch (error) {
    console.error('Lỗi khi tải danh sách cấp trên:', error)
    return NextResponse.json({ success: false, message: 'Lỗi khi tải danh sách cấp trên' }, { status: 500 })
  }
}
