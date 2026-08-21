/**
 * File: app/api/documents/route.ts
 * Mô tả: API tài liệu quân lực - Danh sách, Thêm mới, Cập nhật, Xóa
 * Cập nhật: 2026-08-16
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

/**
 * GET /api/documents
 * Lấy danh sách tài liệu hoặc chi tiết tài liệu
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';
    const documentId = searchParams.get('documentId') || '';

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu UserID' },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // Gọi Stored Procedure W02P0001
    const result = await pool.request()
      .input('UserID', sql.VarChar, userId)
      .input('DocumentID', sql.VarChar, documentId)
      .execute('W02P0001');

    // Nếu không có documentId, trả về danh sách
    if (!documentId) {
      // Lấy danh sách tài liệu kèm số lượng file đính kèm
      const documents = await pool.request()
        .query(`
          SELECT 
            md.DocumentID,
            md.DocumentName,
            md.CreatedDate,
            md.UnitID,
            md.StatusID,
            s.Description AS StatusName,
            md.Content,
            COUNT(af.FileID) AS AttachmentCount
          FROM MilitaryDocument md
          LEFT JOIN [Status] s ON md.StatusID = s.StatusID
          LEFT JOIN AttachmentFile af ON md.DocumentID = af.ReferenceID AND af.ReferenceType = 'MilitaryDocument'
          GROUP BY md.DocumentID, md.DocumentName, md.CreatedDate, md.UnitID, md.StatusID, s.Description, md.Content
          ORDER BY md.CreatedDate DESC
        `);

      return NextResponse.json({
        success: true,
        data: documents.recordset,
      });
    }

    // Nếu có documentId, trả về chi tiết (2 result sets)
    const documentInfo = result.recordset[0] || null;
    const attachments = Array.isArray(result.recordsets)
      ? result.recordsets[1] || []
      : [];

    if (!documentInfo) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy tài liệu' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        document: {
          DocumentID: documentInfo.DocumentID,
          DocumentName: documentInfo.DocumentName,
          CreatedDate: documentInfo.CreatedDate,
          UnitID: documentInfo.UnitID,
          StatusID: documentInfo.StatusID,
          StatusName: documentInfo.Description,
          Content: documentInfo.Content,
        },
        attachments: attachments.map((file: any) => ({
          FileID: file.FileID || file.AttachmentID,
          FileName: file.FileName || file.FilePath,
          FileSize: file.FileSize,
          UploadedDate: file.UploadedDate,
          FilePath: file.FilePath,
        })),
      },
    });
  } catch (error) {
    console.error('Lỗi khi gọi SP W02P0001:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi tải dữ liệu' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents
 * Thêm tài liệu mới với file đính kèm
 * Chỉ user U002 (Sư đoàn) có quyền
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Check quyền: chỉ U002 được phép
    const createdBy = String(formData.get('CreatedBy') || '');
    if (createdBy !== 'U002') {
      return NextResponse.json(
        { success: false, message: 'Bạn không có quyền thêm tài liệu' },
        { status: 403 }
      );
    }
    const pool = await getPool();

    const DocumentName = String(formData.get('DocumentName') || '');
    const UnitID = String(formData.get('UnitID') || '');
    const StatusID = String(formData.get('StatusID') || 'ST101');
    const Content = String(formData.get('Content') || '');

    if (!DocumentName) {
      return NextResponse.json(
        { success: false, message: 'Thiếu tên tài liệu' },
        { status: 400 }
      );
    }

    // Sinh DocumentID tự động
    const maxIdResult = await pool.request()
      .query(`
        SELECT MAX(
          CAST(
            SUBSTRING(DocumentID, 4, LEN(DocumentID) - 3) AS INT
          )
        ) AS MaxNum
        FROM MilitaryDocument
        WHERE DocumentID LIKE 'DOC%'
      `);

    const maxNum = maxIdResult.recordset[0]?.MaxNum || 0;
    const newDocumentID = `DOC${String(maxNum + 1).padStart(3, '0')}`;

    // Thêm tài liệu mới
    await pool.request()
      .input('DocumentID', sql.VarChar, newDocumentID)
      .input('DocumentName', sql.NVarChar, DocumentName)
      .input('UnitID', sql.VarChar, UnitID || null)
      .input('StatusID', sql.VarChar, StatusID)
      .input('Content', sql.NVarChar, Content)
      .query(`
        INSERT INTO MilitaryDocument (
          DocumentID, DocumentName, UnitID, StatusID, Content, CreatedDate
        ) VALUES (
          @DocumentID, @DocumentName, @UnitID, @StatusID, @Content, GETDATE()
        )
      `);

    // Xử lý file đính kèm
    const files = formData.getAll('files');
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents', newDocumentID);

    // Tạo thư mục nếu chưa có
    await mkdir(uploadDir, { recursive: true });

    for (const item of files) {
      if (!(item instanceof File)) continue;

      const file = item;
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = path.join(uploadDir, fileName);

      // Lưu file vào thư mục
      await writeFile(filePath, buffer);

      // Sinh FileID tự động
      const maxFileIdResult = await pool.request()
        .query(`
          SELECT MAX(
            CAST(
              SUBSTRING(FileID, 4, LEN(FileID) - 3) AS INT
            )
          ) AS MaxNum
          FROM AttachmentFile
          WHERE FileID LIKE 'FIL%'
        `);

      const maxFileNum = maxFileIdResult.recordset[0]?.MaxFileNum || 0;
      const newFileID = `FIL${String(maxFileNum + 1).padStart(3, '0')}`;

      // Lưu thông tin file vào database
      const relativePath = `/uploads/documents/${newDocumentID}/${fileName}`;
      await pool.request()
        .input('FileID', sql.VarChar, newFileID)
        .input('ReferenceID', sql.VarChar, newDocumentID)
        .input('ReferenceType', sql.VarChar, 'MilitaryDocument')
        .input('FileName', sql.NVarChar, file.name)
        .input('FilePath', sql.VarChar, relativePath)
        .query(`
          INSERT INTO AttachmentFile (
            FileID, ReferenceID, ReferenceType, FileName, FilePath, UploadedDate
          ) VALUES (
            @FileID, @ReferenceID, @ReferenceType, @FileName, @FilePath, GETDATE()
          )
        `);
    }

    return NextResponse.json({
      success: true,
      message: 'Đã thêm tài liệu mới',
      data: { DocumentID: newDocumentID },
    });

  } catch (error: any) {
    console.error('========== LỖI THÊM TÀI LIỆU ==========');
    console.error('Message:', error?.message);
    console.error('Stack:', error?.stack);
    console.error('========================================');

    return NextResponse.json(
      { success: false, message: error?.message || 'Lỗi khi thêm tài liệu' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/documents
 * Cập nhật tài liệu với file đính kèm
 * Chỉ user U002 (Sư đoàn) có quyền
 */
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Check quyền: chỉ U002 được phép
    const modifiedBy = String(formData.get('ModifiedBy') || '');
    if (modifiedBy !== 'U002') {
      return NextResponse.json(
        { success: false, message: 'Bạn không có quyền cập nhật tài liệu' },
        { status: 403 }
      );
    }
    
    const pool = await getPool();

    const DocumentID = String(formData.get('DocumentID') || '');
    const DocumentName = String(formData.get('DocumentName') || '');
    const UnitID = String(formData.get('UnitID') || '');
    const StatusID = String(formData.get('StatusID') || 'ST101');
    const Content = String(formData.get('Content') || '');
    const deletedFileIds = String(formData.get('deletedFileIds') || '');

    if (!DocumentID) {
      return NextResponse.json(
        { success: false, message: 'Thiếu DocumentID' },
        { status: 400 }
      );
    }

    // Cập nhật thông tin tài liệu
    await pool.request()
      .input('DocumentID', sql.VarChar, DocumentID)
      .input('DocumentName', sql.NVarChar, DocumentName)
      .input('UnitID', sql.VarChar, UnitID || null)
      .input('StatusID', sql.VarChar, StatusID)
      .input('Content', sql.NVarChar, Content)
      .query(`
        UPDATE MilitaryDocument
        SET
          DocumentName = @DocumentName,
          UnitID = @UnitID,
          StatusID = @StatusID,
          Content = @Content
        WHERE DocumentID = @DocumentID
      `);

    // Xử lý xóa file đính kèm
    if (deletedFileIds) {
      const fileIdArray = deletedFileIds.split(',').filter(id => id.trim());
      for (const fileId of fileIdArray) {
        await pool.request()
          .input('FileID', sql.VarChar, fileId.trim())
          .query(`
            DELETE FROM AttachmentFile
            WHERE FileID = @FileID
          `);
      }
    }

    // Xử lý thêm file đính kèm mới
    const files = formData.getAll('files');
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents', DocumentID);

    // Tạo thư mục nếu chưa có
    await mkdir(uploadDir, { recursive: true });

    for (const item of files) {
      if (!(item instanceof File)) continue;

      const file = item;
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = path.join(uploadDir, fileName);

      // Lưu file vào thư mục
      await writeFile(filePath, buffer);

      // Sinh FileID tự động
      const maxFileIdResult = await pool.request()
        .query(`
          SELECT MAX(
            CAST(
              SUBSTRING(FileID, 4, LEN(FileID) - 3) AS INT
            )
          ) AS MaxNum
          FROM AttachmentFile
          WHERE FileID LIKE 'FIL%'
        `);

      const maxFileNum = maxFileIdResult.recordset[0]?.MaxNum || 0;
      const newFileID = `FIL${String(maxFileNum + 1).padStart(3, '0')}`;

      // Lưu thông tin file vào database
      const relativePath = `/uploads/documents/${DocumentID}/${fileName}`;
      await pool.request()
        .input('FileID', sql.VarChar, newFileID)
        .input('ReferenceID', sql.VarChar, DocumentID)
        .input('ReferenceType', sql.VarChar, 'MilitaryDocument')
        .input('FileName', sql.NVarChar, file.name)
        .input('FilePath', sql.VarChar, relativePath)
        .query(`
          INSERT INTO AttachmentFile (
            FileID, ReferenceID, ReferenceType, FileName, FilePath, UploadedDate
          ) VALUES (
            @FileID, @ReferenceID, @ReferenceType, @FileName, @FilePath, GETDATE()
          )
        `);
    }

    return NextResponse.json({
      success: true,
      message: 'Đã cập nhật tài liệu',
    });

  } catch (error: any) {
    console.error('========== LỖI CẬP NHẬT TÀI LIỆU ==========');
    console.error('Message:', error?.message);
    console.error('Stack:', error?.stack);
    console.error('============================================');

    return NextResponse.json(
      { success: false, message: error?.message || 'Lỗi khi cập nhật tài liệu' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents
 * Xóa tài liệu
 * Chỉ user U002 (Sư đoàn) có quyền
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId') || '';
    const userId = searchParams.get('userId') || '';

    if (!documentId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu DocumentID' },
        { status: 400 }
      );
    }

    // Check quyền: chỉ U002 được phép
    if (userId !== 'U002') {
      return NextResponse.json(
        { success: false, message: 'Bạn không có quyền xóa tài liệu' },
        { status: 403 }
      );
    }

    const pool = await getPool();

    // Xóa file đính kèm trước
    await pool.request()
      .input('ReferenceID', sql.VarChar, documentId)
      .query(`
        DELETE FROM AttachmentFile
        WHERE ReferenceID = @ReferenceID
      `);

    // Xóa tài liệu
    await pool.request()
      .input('DocumentID', sql.VarChar, documentId)
      .query(`
        DELETE FROM MilitaryDocument
        WHERE DocumentID = @DocumentID
      `);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa tài liệu',
    });
  } catch (error) {
    console.error('Lỗi khi xóa tài liệu:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi xóa tài liệu' },
      { status: 500 }
    );
  }
}
