/**
 * File: app/api/soldiers/[id]/training-process/route.ts
 * Mô tả: API lấy và lưu Quá trình đào tạo của quân nhân
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';

interface TrainingProcessInput {
  TrainingID?: string | null;
  SchoolName?: string | null;
  MajorName?: string | null;
  FromDate?: string | null;
  ToDate?: string | null;
  TrainingType?: string | null;
  Certificate?: string | null;
  Description?: string | null;
}

function normalizeText(value: unknown) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function hasTrainingProcessContent(item: TrainingProcessInput) {
  return [
    item.SchoolName,
    item.MajorName,
    item.FromDate,
    item.ToDate,
    item.TrainingType,
    item.Certificate,
    item.Description,
  ].some((value) => normalizeText(value));
}

function makeTrainingId() {
  return `TR${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase().slice(0, 20);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Thiếu SoldierID' },
        { status: 400 }
      );
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('SoldierID', sql.VarChar, id)
      .query(`
        SELECT
          TrainingID,
          SoldierID,
          SchoolName,
          MajorName,
          FromDate,
          ToDate,
          TrainingType,
          Certificate,
          Description
        FROM SoldierTrainingProcess
        WHERE SoldierID = @SoldierID
        ORDER BY TrainingID
      `);

    return NextResponse.json({ success: true, data: result.recordset || [] });
  } catch (error) {
    console.error('Lỗi khi lấy quá trình đào tạo:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi tải quá trình đào tạo' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const items: TrainingProcessInput[] = Array.isArray(body?.data) ? body.data : [];

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Thiếu SoldierID' },
        { status: 400 }
      );
    }

    const records = items.filter(hasTrainingProcessContent);
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      await new sql.Request(transaction)
        .input('SoldierID', sql.VarChar, id)
        .query('DELETE FROM SoldierTrainingProcess WHERE SoldierID = @SoldierID');

      for (const item of records) {
        await new sql.Request(transaction)
          .input('TrainingID', sql.VarChar, normalizeText(item.TrainingID) || makeTrainingId())
          .input('SoldierID', sql.VarChar, id)
          .input('SchoolName', sql.NVarChar, normalizeText(item.SchoolName))
          .input('MajorName', sql.NVarChar, normalizeText(item.MajorName))
          .input('FromDate', sql.NVarChar, normalizeText(item.FromDate))
          .input('ToDate', sql.NVarChar, normalizeText(item.ToDate))
          .input('TrainingType', sql.NVarChar, normalizeText(item.TrainingType))
          .input('Certificate', sql.NVarChar, normalizeText(item.Certificate))
          .input('Description', sql.NVarChar, normalizeText(item.Description))
          .query(`
            INSERT INTO SoldierTrainingProcess (
              TrainingID, SoldierID, SchoolName, MajorName, FromDate, ToDate,
              TrainingType, Certificate, Description
            ) VALUES (
              @TrainingID, @SoldierID, @SchoolName, @MajorName, @FromDate, @ToDate,
              @TrainingType, @Certificate, @Description
            )
          `);
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Đã lưu quá trình đào tạo',
      count: records.length,
    });
  } catch (error) {
    console.error('Lỗi khi lưu quá trình đào tạo:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi lưu quá trình đào tạo' },
      { status: 500 }
    );
  }
}