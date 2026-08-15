/**
 * File: app/api/soldiers/[id]/photo/route.ts
 * Mô tả: API xử lý upload và xóa ảnh quân nhân
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import sql from 'mssql'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// POST: Upload ảnh quân nhân
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: soldierId } = await params
    const formData = await request.formData()
    const photoFile = formData.get('photo') as File
    const userId = formData.get('userId') as string

    if (!photoFile) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy file ảnh' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu userId' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(photoFile.type)) {
      return NextResponse.json(
        { success: false, message: 'Chỉ chấp nhận file JPG, PNG' },
        { status: 400 }
      )
    }

    // Validate file size (5MB)
    if (photoFile.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: 'Kích thước ảnh không được vượt quá 5MB' },
        { status: 400 }
      )
    }

    // Tạo thư mục uploads nếu chưa có
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'soldiers')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Tạo tên file unique
    const fileExtension = photoFile.name.split('.').pop()
    const fileName = `${soldierId}_${Date.now()}.${fileExtension}`
    const filePath = path.join(uploadDir, fileName)

    // Lưu file
    const bytes = await photoFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Đường dẫn tương đối để lưu vào DB
    const photoPath = `/uploads/soldiers/${fileName}`

    // Cập nhật database
    const pool = await getPool()
    await pool.request()
      .input('SoldierID', sql.VarChar, soldierId)
      .input('PhotoPath', sql.NVarChar, photoPath)
      .input('LastModifiedBy', sql.VarChar, userId)
      .query(`
        UPDATE Soldier 
        SET PhotoPath = @PhotoPath, 
            LastModifiedDate = GETDATE(),
            LastModifiedBy = @LastModifiedBy
        WHERE SoldierID = @SoldierID
      `)

    return NextResponse.json({
      success: true,
      message: 'Đã tải ảnh lên thành công',
      data: { photoPath }
    })
  } catch (error) {
    console.error('Lỗi khi upload ảnh:', error)
    return NextResponse.json(
      { success: false, message: 'Lỗi khi tải ảnh lên' },
      { status: 500 }
    )
  }
}

// DELETE: Xóa ảnh quân nhân
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: soldierId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu userId' },
        { status: 400 }
      )
    }

    // Lấy thông tin ảnh hiện tại
    const pool = await getPool()
    const result = await pool.request()
      .input('SoldierID', sql.VarChar, soldierId)
      .query('SELECT PhotoPath FROM Soldier WHERE SoldierID = @SoldierID')

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy quân nhân' },
        { status: 404 }
      )
    }

    const currentPhotoPath = result.recordset[0].PhotoPath

    // Xóa file vật lý nếu có
    if (currentPhotoPath) {
      const filePath = path.join(process.cwd(), 'public', currentPhotoPath)
      if (existsSync(filePath)) {
        await unlink(filePath)
      }
    }

    // Cập nhật database
    await pool.request()
      .input('SoldierID', sql.VarChar, soldierId)
      .input('LastModifiedBy', sql.VarChar, userId)
      .query(`
        UPDATE Soldier 
        SET PhotoPath = NULL, 
            LastModifiedDate = GETDATE(),
            LastModifiedBy = @LastModifiedBy
        WHERE SoldierID = @SoldierID
      `)

    return NextResponse.json({
      success: true,
      message: 'Đã xóa ảnh thành công'
    })
  } catch (error) {
    console.error('Lỗi khi xóa ảnh:', error)
    return NextResponse.json(
      { success: false, message: 'Lỗi khi xóa ảnh' },
      { status: 500 }
    )
  }
}
