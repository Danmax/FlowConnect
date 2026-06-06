import { NextRequest, NextResponse } from "next/server";
import {
  createConnectionForUser,
  listConnectionsForUser,
  toSafeConnection
} from "@/lib/connection-repository";
import { getRequestUserId } from "@/lib/request-user";

export async function GET(request: NextRequest) {
  const userId = getRequestUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Authenticated user id is required." }, { status: 401 });
  }

  const connections = await listConnectionsForUser(userId);

  return NextResponse.json({ connections: connections.map(toSafeConnection) });
}

export async function POST(request: NextRequest) {
  const userId = getRequestUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Authenticated user id is required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    connectorId?: string;
    displayName?: string;
    credentials?: Record<string, string>;
  };

  if (!body.connectorId || !body.credentials) {
    return NextResponse.json({ error: "connectorId and credentials are required." }, { status: 400 });
  }

  try {
    const connection = await createConnectionForUser({
      userId,
      connectorId: body.connectorId,
      displayName: body.displayName ?? "",
      credentials: body.credentials
    });

    return NextResponse.json({ connection: connection ? toSafeConnection(connection) : null }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Connection could not be saved." },
      { status: 400 }
    );
  }
}
