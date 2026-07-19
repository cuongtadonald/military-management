import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
  try {
    console.log('🔍 Đang kết nối đến SQL Server...');
    
    const pool = await getPool();
    console.log('✅ Pool đã sẵn sàng');

    // Test query đơn giản: Lấy 5 chiến sĩ đầu tiên
    const result = await pool.request().query(`
      SELECT TOP 5 
        SoldierID, 
        FullName, 
        DateOfBirth,
        CitizenID,
        Hometown
      FROM Soldier
      ORDER BY SoldierID
    `);

    console.log('📊 Kết quả query TVC:', result.recordset);
    console.log(`📈 Số bản ghi: ${result.recordset.length}`);

    return NextResponse.json({
      success: true,
      message: 'Kết nối SQL Server thành công!',
      data: result.recordset,
      count: result.recordset.length,
    });
  } catch (error) {
    console.error('❌ Lỗi chi tiết:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi kết nối SQL Server',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}