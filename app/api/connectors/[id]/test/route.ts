import { NextResponse } from "next/server";
import { demoConnectionFor, testStoredConnection } from "@/lib/connector-runtime";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const connection = await demoConnectionFor(id);
  const result = await testStoredConnection(connection);

  return NextResponse.json({
    connectorId: id,
    connectionId: connection.id,
    result
  });
}
