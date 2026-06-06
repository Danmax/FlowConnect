import { NextResponse } from "next/server";
import { connectorRegistry } from "@/lib/connector-sdk";

export async function GET() {
  return NextResponse.json({
    connectors: connectorRegistry.map(({ testConnection, refreshToken, ...connector }) => connector)
  });
}
