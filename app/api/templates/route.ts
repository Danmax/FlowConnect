import { NextRequest, NextResponse } from "next/server";
import { searchTemplates } from "@/lib/marketplace";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  return NextResponse.json({
    templates: searchTemplates(
      searchParams.get("q") ?? undefined,
      searchParams.get("app") ?? undefined,
      searchParams.get("category") ?? undefined
    )
  });
}
