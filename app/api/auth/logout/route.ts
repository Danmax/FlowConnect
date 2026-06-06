import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, revokeSession, sessionCookieName } from "@/lib/auth";

export async function POST(request: NextRequest) {
  await revokeSession(request.cookies.get(sessionCookieName)?.value);

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);

  return response;
}
