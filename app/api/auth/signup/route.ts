import { NextRequest, NextResponse } from "next/server";
import { applySessionCookie, createSession, createUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
  };

  if (!body.firstName || !body.lastName || !body.email || !body.password) {
    return NextResponse.json({ error: "First name, last name, email, and password are required." }, { status: 400 });
  }

  if (body.password.length < 10) {
    return NextResponse.json({ error: "Password must be at least 10 characters." }, { status: 400 });
  }

  try {
    const user = await createUser({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      password: body.password
    });

    if (!user) {
      return NextResponse.json({ error: "User could not be created." }, { status: 500 });
    }

    const session = await createSession(user.id);
    const response = NextResponse.json({ user }, { status: 201 });
    applySessionCookie(response, session.token, session.expiresAt);

    return response;
  } catch (error) {
    const message = error instanceof Error && error.message.includes("Duplicate")
      ? "A user with that email already exists."
      : "Signup failed.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
