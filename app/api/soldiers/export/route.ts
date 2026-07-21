import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {

        const pool = await getPool();

        const result = await pool.request().query(`
            SELECT
                SoldierID,
                FullName,
                Gender,
                DateOfBirth,
                CitizenID,
                UnitName,
                Position,
                RankName,
                StatusName
            FROM Soldiers
            ORDER BY FullName
        `);

        return NextResponse.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {

        console.error(error);

        return NextResponse.json({
            success: false,
            message: "Lỗi xuất dữ liệu"
        }, { status: 500 });

    }
}