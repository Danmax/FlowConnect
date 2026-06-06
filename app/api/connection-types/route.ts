import { NextResponse } from "next/server";
import { connectorRegistry } from "@/lib/connector-sdk";

export async function GET() {
  return NextResponse.json({
    connectionTypes: connectorRegistry.map(({ testConnection, refreshToken, ...connector }) => connector)
  });
}
