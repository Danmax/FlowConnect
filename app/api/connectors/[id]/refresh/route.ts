import { NextResponse } from "next/server";
import { demoConnectionFor, refreshStoredConnectionToken } from "@/lib/connector-runtime";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const connection = await demoConnectionFor(id);
  const token = await refreshStoredConnectionToken(connection);

  return NextResponse.json({
    connectorId: id,
    connectionId: connection.id,
    token: {
      expiresAt: token.expiresAt,
      hasAccessToken: Boolean(token.accessToken),
      hasRefreshToken: Boolean(token.refreshToken)
    }
  });
}
