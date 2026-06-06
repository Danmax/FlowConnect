import { NextRequest, NextResponse } from "next/server";
import { getConnectionForUser, updateConnectionHealth } from "@/lib/connection-repository";
import { testStoredConnection } from "@/lib/connector-runtime";
import { getRequestUserId } from "@/lib/request-user";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const userId = await getRequestUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Authenticated user id is required." }, { status: 401 });
  }

  const { id } = await context.params;
  const connectionId = Number(id);

  if (!Number.isInteger(connectionId)) {
    return NextResponse.json({ error: "Connection id must be numeric." }, { status: 400 });
  }

  const connection = await getConnectionForUser(connectionId, userId);

  if (!connection) {
    return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  }

  const result = await testStoredConnection(connection);
  await updateConnectionHealth(connection.id, userId, result.ok ? "healthy" : "unhealthy");

  return NextResponse.json({ connectionId, result });
}
