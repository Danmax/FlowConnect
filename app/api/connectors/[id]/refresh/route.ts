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
      error: "Token refresh requires a saved user connection. Use the connection refresh workflow after OAuth storage is configured."
    },
    { status: 400 }
  );
}
