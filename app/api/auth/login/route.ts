import { NextRequest, NextResponse } from "next/server";
import { applySessionCookie, authenticateUser, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await authenticateUser(body.email, body.password);

  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const session = await createSession(user.id);
  const response = NextResponse.json({ user });
  applySessionCookie(response, session.token, session.expiresAt);

  return response;
}
