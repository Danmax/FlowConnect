import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db().query("SELECT 1 AS ok");

    return NextResponse.json({
      ok: true,
      database: process.env.DB_NAME,
      rows
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Database connection failed"
      },
      { status: 500 }
    );
  }
}
