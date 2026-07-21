/**
 * File: app/api/documents/route.ts
 * Mô tả: API tài liệu quân lực - Danh sách, Thêm mới, Cập nhật, Xóa
 * Cập nhật: 2026-07-21
 * 
 * GET: Gọi SP W02P0001 để lấy danh sách hoặc chi tiết
 * POST: Thêm tài liệu mới
 * PUT: Cập nhật tài liệu
 * DELETE: Xóa tài liệu
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';

/**
 * GET /api/documents
 * Lấy danh sách tài liệu hoặc chi tiết tài liệu
 * 
 * Query params:
 * - userId: ID người dùng (bắt buộc)
 * - documentId: ID tài liệu (optional, nếu có sẽ lấy chi tiết)
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
      const documents = result.recordset.map((row: any) => ({
        DocumentID: row.DocumentID,
        DocumentName: row.DocumentName,
        CreatedDate: row.CreatedDate,
        UnitID: row.UnitID,
        StatusID: row.StatusID,
        StatusName: row.Description // Description từ STATUS table là trạng thái
      }));

      return NextResponse.json({
        success: true,
        data: documents,
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
 * Thêm tài liệu mới
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pool = await getPool();

    // Sinh DocumentID tự động (DOC + số thứ tự)
    const maxIdResult = await pool.request()
      .query(`
        SELECT MAX(CAST(SUBSTRING(DocumentID, 4, LEN(DocumentID) - 3) AS INT)) as MaxNum
        FROM MilitaryDocument
        WHERE DocumentID LIKE 'DOC%'
      `);

    const maxNum = maxIdResult.recordset[0]?.MaxNum || 0;
    const newDocumentID = `DOC${String(maxNum + 1).padStart(3, '0')}`;

    // Thêm tài liệu mới
    await pool.request()
      .input('DocumentID', sql.VarChar, newDocumentID)
      .input('DocumentName', sql.NVarChar, body.DocumentName)
      .input('UnitID', sql.VarChar, body.UnitID)
      .input('StatusID', sql.VarChar, body.StatusID || 'ST001')
      .input('Content', sql.NVarChar, body.Content || '')
      .input('CreatedBy', sql.VarChar, body.CreatedBy || '')
      .query(`
        INSERT INTO MilitaryDocument (
          DocumentID, DocumentName, UnitID, StatusID, Content, CreatedDate, CreatedBy
        ) VALUES (
          @DocumentID, @DocumentName, @UnitID, @StatusID, @Content, GETDATE(), @CreatedBy
        )
      `);

    // Xử lý file đính kèm nếu có
    if (body.attachments && Array.isArray(body.attachments)) {
      for (const file of body.attachments) {
        await pool.request()
          .input('ReferenceID', sql.VarChar, newDocumentID)
          .input('FileName', sql.NVarChar, file.FileName)
          .input('FilePath', sql.NVarChar, file.FilePath)
          .input('ReferenceType', sql.Int, file.ReferenceType || 0)
          .query(`
            INSERT INTO AttachmentFile (
              ReferenceID, FileName, FilePath, ReferenceType, UploadedDate
            ) VALUES (
              @ReferenceID, @FileName, @FilePath, @ReferenceType, GETDATE()
            )
          `);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Đã thêm tài liệu mới',
      data: { DocumentID: newDocumentID },
    });
  } catch (error) {
    console.error('Lỗi khi thêm tài liệu:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi thêm tài liệu' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/documents
 * Cập nhật tài liệu
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const pool = await getPool();

    // Cập nhật thông tin tài liệu
    await pool.request()
      .input('DocumentID', sql.VarChar, body.DocumentID)
      .input('DocumentName', sql.NVarChar, body.DocumentName)
      .input('UnitID', sql.VarChar, body.UnitID)
      .input('StatusID', sql.VarChar, body.StatusID)
      .input('Content', sql.NVarChar, body.Content || '')
      .input('ModifiedBy', sql.VarChar, body.ModifiedBy || '')
      .query(`
        UPDATE MilitaryDocument
        SET DocumentName = @DocumentName,
            UnitID = @UnitID,
            StatusID = @StatusID,
            Content = @Content,
            LastModifiedDate = GETDATE(),
            LastModifiedBy = @ModifiedBy
        WHERE DocumentID = @DocumentID
      `);

    // Xử lý thêm file đính kèm mới nếu có
    if (body.newAttachments && Array.isArray(body.newAttachments)) {
      for (const file of body.newAttachments) {
        await pool.request()
          .input('ReferenceID', sql.VarChar, body.DocumentID)
          .input('FileName', sql.NVarChar, file.FileName)
          .input('FilePath', sql.NVarChar, file.FilePath)
          .input('FileSize', sql.Int, file.FileSize || 0)
          .query(`
            INSERT INTO AttachmentFile (
              ReferenceID, FileName, FilePath, FileSize, UploadedDate
            ) VALUES (
              @ReferenceID, @FileName, @FilePath, @FileSize, GETDATE()
            )
          `);
      }
    }

    // Xử lý xóa file đính kèm nếu có
    if (body.deletedFileIds && Array.isArray(body.deletedFileIds)) {
      for (const fileId of body.deletedFileIds) {
        await pool.request()
          .input('FileID', sql.VarChar, fileId)
          .query(`
            DELETE FROM AttachmentFile
            WHERE FileID = @FileID OR AttachmentID = @FileID
          `);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Đã cập nhật tài liệu',
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật tài liệu:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi cập nhật tài liệu' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents
 * Xóa tài liệu
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId') || '';

    if (!documentId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu DocumentID' },
        { status: 400 }
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
