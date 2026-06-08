import { NextRequest, NextResponse } from "next/server";
import { getConnectionForUser, toSafeConnection, updateConnectionStatusForUser } from "@/lib/connection-repository";
import type { StoredConnection } from "@/lib/connector-runtime";
import { getRequestUserId } from "@/lib/request-user";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const allowedStatuses = new Set<StoredConnection["status"]>(["enabled", "disabled"]);

export async function PATCH(request: NextRequest, context: RouteContext) {
  const userId = await getRequestUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Authenticated user id is required." }, { status: 401 });
  }

  const { id } = await context.params;
  const connectionId = Number(id);

  if (!Number.isInteger(connectionId) || connectionId <= 0) {
    return NextResponse.json({ error: "Connection id must be numeric." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { status?: StoredConnection["status"] };

  if (!body.status || !allowedStatuses.has(body.status)) {
    return NextResponse.json({ error: "Status must be enabled or disabled." }, { status: 400 });
  }

  const updated = await updateConnectionStatusForUser(connectionId, userId, body.status);

  if (!updated) {
    return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  }

  const connection = await getConnectionForUser(connectionId, userId);

  return NextResponse.json({ connection: connection ? toSafeConnection(connection) : null });
}
