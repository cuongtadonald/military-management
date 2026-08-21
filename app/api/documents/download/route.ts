/**
 * File: app/api/documents/download/route.ts
 * Mô tả: API tải xuống file đính kèm tài liệu
 * Cập nhật: 2026-08-19
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';
import { readFile, stat } from 'fs/promises';
import path from 'path';

/**
 * GET /api/documents/download?fileId=xxx
 * Tải xuống file đính kèm theo FileID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId') || '';

    if (!fileId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu FileID' },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // Lấy thông tin file từ database
    const result = await pool.request()
      .input('FileID', sql.VarChar, fileId)
      .query(`
        SELECT FileName, FilePath
        FROM AttachmentFile
        WHERE FileID = @FileID
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy file' },
        { status: 404 }
      );
    }

    const fileRecord = result.recordset[0];
    const filePath = fileRecord.FilePath;
    const fileName = fileRecord.FileName;

    // Đường dẫn tuyệt đối tới file trên server
    const absolutePath = path.join(process.cwd(), 'public', filePath);

    // Kiểm tra file có tồn tại không
    try {
      await stat(absolutePath);
    } catch {
      return NextResponse.json(
        { success: false, message: 'File không tồn tại trên server' },
        { status: 404 }
      );
    }

    // Đọc file
    const fileBuffer = await readFile(absolutePath);

    // Xác định Content-Type dựa trên extension
    const ext = path.extname(fileName).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // Trả về file với header để browser tải xuống
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Lỗi khi tải file:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi tải file' },
      { status: 500 }
    );
  }
}
