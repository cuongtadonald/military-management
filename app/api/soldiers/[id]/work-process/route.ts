/**
 * File: app/api/soldiers/[id]/work-process/route.ts
 * Mô tả: API lấy và lưu Quá trình công tác của quân nhân
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import sql from 'mssql';

interface WorkProcessInput {
  WorkProcessID?: string | null;
  FromDate?: string | null;
  ToDate?: string | null;
  WorkDescription?: string | null;
  RankID?: string | null;
  PartyPosition?: string | null;
  Description?: string | null;
}

function normalizeText(value: unknown) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function hasWorkProcessContent(item: WorkProcessInput) {
  return [
    item.FromDate,
    item.ToDate,
    item.WorkDescription,
    item.RankID,
    item.PartyPosition,
    item.Description,
  ].some((value) => normalizeText(value));
}

function makeWorkProcessId() {
  return `WP${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase().slice(0, 20);
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
          WorkProcessID,
          SoldierID,
          FromDate,
          ToDate,
          WorkDescription,
          RankID,
          PartyPosition,
          Description
        FROM SoldierWorkProcess
        WHERE SoldierID = @SoldierID
        ORDER BY WorkProcessID
      `);

    return NextResponse.json({ success: true, data: result.recordset || [] });
  } catch (error) {
    console.error('Lỗi khi lấy quá trình công tác:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi tải quá trình công tác' },
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
    const items: WorkProcessInput[] = Array.isArray(body?.data) ? body.data : [];

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Thiếu SoldierID' },
        { status: 400 }
      );
    }

    const records = items.filter(hasWorkProcessContent);
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      await new sql.Request(transaction)
        .input('SoldierID', sql.VarChar, id)
        .query('DELETE FROM SoldierWorkProcess WHERE SoldierID = @SoldierID');

      for (const item of records) {
        await new sql.Request(transaction)
          .input('WorkProcessID', sql.VarChar, normalizeText(item.WorkProcessID) || makeWorkProcessId())
          .input('SoldierID', sql.VarChar, id)
          .input('FromDate', sql.NVarChar, normalizeText(item.FromDate))
          .input('ToDate', sql.NVarChar, normalizeText(item.ToDate))
          .input('WorkDescription', sql.NVarChar, normalizeText(item.WorkDescription))
          .input('RankID', sql.VarChar, normalizeText(item.RankID))
          .input('PartyPosition', sql.NVarChar, normalizeText(item.PartyPosition))
          .input('Description', sql.NVarChar, normalizeText(item.Description))
          .query(`
            INSERT INTO SoldierWorkProcess (
              WorkProcessID, SoldierID, FromDate, ToDate, WorkDescription,
              RankID, PartyPosition, Description
            ) VALUES (
              @WorkProcessID, @SoldierID, @FromDate, @ToDate, @WorkDescription,
              @RankID, @PartyPosition, @Description
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
      message: 'Đã lưu quá trình công tác',
      count: records.length,
    });
  } catch (error) {
    console.error('Lỗi khi lưu quá trình công tác:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi lưu quá trình công tác' },
      { status: 500 }
    );
  }
}