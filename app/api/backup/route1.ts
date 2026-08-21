/**
 * File: app/api/backup/route.ts
 * Mô tả: API trigger backup thủ công và lấy danh sách backup
 * Cập nhật: 2026-08-19
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readdir, stat } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const BACKUP_ROOT = process.env.BACKUP_PATH || 'C:\\QuanLyQuanLuc_Backups';

/**
 * GET /api/backup
 * Lấy danh sách các backup đã có
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'database', 'files', 'all'

    const backups: {
      database: BackupInfo[];
      files: BackupInfo[];
    } = {
      database: [],
      files: [],
    };

    // Lấy danh sách backup database
    if (type === 'all' || type === 'database') {
      const dbBackupDir = path.join(BACKUP_ROOT, 'Database');
      try {
        const files = await readdir(dbBackupDir);
        const bakFiles = files.filter(f => f.endsWith('.bak'));
        
        for (const file of bakFiles) {
          const filePath = path.join(dbBackupDir, file);
          const stats = await stat(filePath);
          backups.database.push({
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.birthtime.toISOString(),
            type: 'database',
          });
        }
        
        // Sắp xếp theo thời gian mới nhất
        backups.database.sort((a, b) => 
          new Date(b.created).getTime() - new Date(a.created).getTime()
        );
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error('Lỗi khi đọc thư mục backup database:', err);
        }
      }
    }

    // Lấy danh sách backup files
    if (type === 'all' || type === 'files') {
      const filesBackupDir = path.join(BACKUP_ROOT, 'Files');
      try {
        const folders = await readdir(filesBackupDir);
        
        for (const folder of folders) {
          const folderPath = path.join(filesBackupDir, folder);
          const stats = await stat(folderPath);
          if (stats.isDirectory()) {
            backups.files.push({
              name: folder,
              path: folderPath,
              size: 0, // Sẽ tính sau nếu cần
              created: stats.birthtime.toISOString(),
              type: 'files',
            });
          }
        }
        
        // Sắp xếp theo thời gian mới nhất
        backups.files.sort((a, b) => 
          new Date(b.created).getTime() - new Date(a.created).getTime()
        );
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error('Lỗi khi đọc thư mục backup files:', err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: backups,
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách backup:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi lấy danh sách backup' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/backup
 * Trigger backup thủ công
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = 'all', userId } = body;

    // Check quyền: chỉ U002 được phép backup
    if (userId !== 'U002') {
      return NextResponse.json(
        { success: false, message: 'Bạn không có quyền thực hiện backup' },
        { status: 403 }
      );
    }

    const scriptPath = path.join(process.cwd(), 'scripts', 'backup');
    
    let command = '';
    if (type === 'database') {
      // Chỉ backup database
      const dbName = process.env.DB_NAME || 'QlyQuanLuc';
      const dbServer = process.env.DB_SERVER || 'localhost';
      const dbUser = process.env.DB_USER || 'quanluc';
      const dbPassword = process.env.DB_PASSWORD || '';
      
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
      const backupFile = `QlyQuanLuc_${timestamp}.bak`;
      const backupPath = path.join(BACKUP_ROOT, 'Database', backupFile);
      
      // Đảm bảo thư mục tồn tại
      const { mkdir } = await import('fs/promises');
      await mkdir(path.join(BACKUP_ROOT, 'Database'), { recursive: true });
      
      const sqlCmd = `BACKUP DATABASE [${dbName}] TO DISK = '${backupPath}' WITH COMPRESSION`;
      
      const pool = await getPool();
      await pool.request().query(sqlCmd);
      
      return NextResponse.json({
        success: true,
        message: 'Backup database hoàn tất',
        data: { path: backupPath },
      });
      
    } else if (type === 'files') {
      // Chỉ backup files
      command = `"${path.join(scriptPath, 'backup-files.bat')}"`;
      
    } else {
      // Backup all
      command = `"${path.join(scriptPath, 'backup-all.bat')}"`;
    }

    // Chạy script backup
    const { stdout, stderr } = await execAsync(command, {
      timeout: 600000, // 10 phút timeout
      cwd: scriptPath,
    });

    if (stderr && !stderr.includes('Thông tin')) {
      console.error('Backup stderr:', stderr);
    }

    return NextResponse.json({
      success: true,
      message: 'Backup hoàn tất',
      data: { output: stdout },
    });

  } catch (error: any) {
    console.error('Lỗi khi thực hiện backup:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Lỗi khi thực hiện backup' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/backup
 * Xóa backup cũ
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const backupPath = searchParams.get('path') || '';
    const userId = searchParams.get('userId') || '';

    // Check quyền
    if (userId !== 'U002') {
      return NextResponse.json(
        { success: false, message: 'Bạn không có quyền xóa backup' },
        { status: 403 }
      );
    }

    if (!backupPath) {
      return NextResponse.json(
        { success: false, message: 'Thiếu đường dẫn backup' },
        { status: 400 }
      );
    }

    // Kiểm tra path có nằm trong thư mục backup không (bảo mật)
    if (!backupPath.startsWith(BACKUP_ROOT)) {
      return NextResponse.json(
        { success: false, message: 'Đường dẫn backup không hợp lệ' },
        { status: 400 }
      );
    }

    const { rm } = await import('fs/promises');
    
    // Kiểm tra là file hay thư mục
    const stats = await stat(backupPath);
    if (stats.isDirectory()) {
      await rm(backupPath, { recursive: true });
    } else {
      await rm(backupPath);
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xóa backup',
    });

  } catch (error: any) {
    console.error('Lỗi khi xóa backup:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Lỗi khi xóa backup' },
      { status: 500 }
    );
  }
}

interface BackupInfo {
  name: string;
  path: string;
  size: number;
  created: string;
  type: 'database' | 'files';
}
