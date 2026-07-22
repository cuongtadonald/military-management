/**
 * File: app/api/change-history/[id]/route.ts
 * Mô tả: API chi tiết lịch sử thay đổi - gọi SP W01P0006
 * Cập nhật: 2026-07-21
 * 
 * W01P0006 Mode 0:
 *   - Result Set 1: Header thông tin lịch sử
 *   - Result Set 2: Chi tiết các trường thay đổi
 * 
 * Xử lý: Map OldValue/NewValue từ ID sang tên hiển thị
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';

// Map các trường cần lookup
const FIELD_LOOKUP: Record<string, { table: string; idColumn: string; nameColumn: string }> = {
  'UnitID': { table: 'OrganizationUnit', idColumn: 'UnitID', nameColumn: 'UnitName' },
  'RankID': { table: 'Rank', idColumn: 'RankID', nameColumn: 'RankName' },
  'StatusID': { table: 'Status', idColumn: 'StatusID', nameColumn: 'StatusName' },
  'ReligionID': { table: 'Religion', idColumn: 'ReligionID', nameColumn: 'ReligionName' },
  'MaritalStatusID': { table: 'MaritalStatus', idColumn: 'MaritalStatusID', nameColumn: 'MaritalStatusName' },
  'WardID': { table: 'Ward', idColumn: 'WardID', nameColumn: 'WardName' },
  'ProvinceID': { table: 'Province', idColumn: 'ProvinceID', nameColumn: 'ProvinceName' },
  'Ethnicity': { table: 'Ethnicity', idColumn: 'EthnicityID', nameColumn: 'EthnicityName' },
  'BloodType': { table: 'BloodType', idColumn: 'BloodTypeID', nameColumn: 'BloodTypeName' },
  'HealthClassification': { table: 'HealthClassification', idColumn: 'HealthClassificationID', nameColumn: 'HealthClassificationName' },
  'EducationLevel': { table: 'EducationLevel', idColumn: 'EducationLevelID', nameColumn: 'EducationLevelName' },
  'PoliticalLevel': { table: 'PoliticalLevel', idColumn: 'PoliticalLevelID', nameColumn: 'PoliticalLevelName' },
  'Specialization': { table: 'Specialization', idColumn: 'SpecializationID', nameColumn: 'SpecializationName' },
}

/**
 * Map giá trị ID sang tên hiển thị
 */
async function mapValueToDisplayName(
  pool: any,
  fieldName: string,
  value: string | null
): Promise<string | null> {
  if (!value || value === '' || value === 'null') return null
  
  const lookup = FIELD_LOOKUP[fieldName]
  if (!lookup) {
    // Không có mapping, trả về giá trị gốc
    return value
  }
  
  try {
    const result = await pool.request()
      .input('id', sql.VarChar, value)
      .query(`SELECT ${lookup.nameColumn} FROM ${lookup.table} WHERE ${lookup.idColumn} = @id`)
    
    if (result.recordset.length > 0) {
      return result.recordset[0][lookup.nameColumn] || value
    }
  } catch (error) {
    console.error(`Lỗi khi map ${fieldName} = ${value}:`, error)
  }
  
  return value
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || ''

    if (!userId || !id) {
      return NextResponse.json({ success: false, message: 'Thiếu tham số' }, { status: 400 })
    }

    const pool = await getPool()
    const result = await pool.request()
      .input('UserID', sql.VarChar, userId)
      .input('ID', sql.VarChar, id)
      .input('Mode', sql.TinyInt, 0)
      .execute('W01P0006')

    const recordsets = result.recordsets as any[]
    const header = recordsets?.[0]?.[0] || null
    const details = recordsets?.[1] || []

    // Map OldValue/NewValue từ ID sang tên hiển thị
    const mappedDetails = await Promise.all(
      details.map(async (detail: any) => {
        const mappedDetail = { ...detail }
        
        if (detail.FieldName && detail.OldValue) {
          mappedDetail.OldValue = await mapValueToDisplayName(pool, detail.FieldName, detail.OldValue)
        }
        
        if (detail.FieldName && detail.NewValue) {
          mappedDetail.NewValue = await mapValueToDisplayName(pool, detail.FieldName, detail.NewValue)
        }
        
        return mappedDetail
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        header,
        details: mappedDetails,
      },
    })
  } catch (error) {
    console.error('Lỗi khi gọi W01P0006 Mode 0:', error)
    return NextResponse.json(
      { success: false, message: 'Lỗi khi tải chi tiết lịch sử thay đổi' },
      { status: 500 }
    )
  }
}