import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  return NextResponse.json(
    {
      connectorId: id,
      error: "Create a user connection first, then test it with POST /api/connections/{id}/test."
    },
    { status: 400 }
  );
}
