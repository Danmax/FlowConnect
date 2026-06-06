import { randomBytes, createHash } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/passwords";

export const sessionCookieName = "flowconnect_session";
const sessionDays = 14;

export type AuthUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "admin" | "builder" | "user";
  status: "pending_verification" | "active" | "disabled";
  planId: "starter" | "pro" | "enterprise";
};

type UserRow = RowDataPacket & {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  role: AuthUser["role"];
  status: AuthUser["status"];
  plan_id: AuthUser["planId"];
};

const mapUser = (row: UserRow): AuthUser => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  role: row.role,
  status: row.status,
  planId: row.plan_id
});

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const createUser = async ({
  firstName,
  lastName,
  email,
  password
}: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) => {
  const normalizedEmail = email.trim().toLowerCase();
  const [result] = await db().execute<ResultSetHeader>(
    `INSERT INTO users (first_name, last_name, email, password_hash, status, role, email_verified_at)
     VALUES (:firstName, :lastName, :email, :passwordHash, 'active', 'builder', NOW())`,
    {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(password)
    }
  );

  return getUserById(result.insertId);
};

export const getUserByEmailWithPassword = async (email: string) => {
  const [rows] = await db().execute<UserRow[]>(
    `SELECT id, first_name, last_name, email, password_hash, role, status, plan_id
     FROM users
     WHERE email = :email
     LIMIT 1`,
    { email: email.trim().toLowerCase() }
  );

  return rows[0] ?? null;
};

export const getUserById = async (userId: number) => {
  const [rows] = await db().execute<UserRow[]>(
    `SELECT id, first_name, last_name, email, password_hash, role, status, plan_id
     FROM users
     WHERE id = :userId
     LIMIT 1`,
    { userId }
  );

  return rows[0] ? mapUser(rows[0]) : null;
};

export const authenticateUser = async (email: string, password: string) => {
  const row = await getUserByEmailWithPassword(email);

  if (!row || row.status === "disabled" || !verifyPassword(password, row.password_hash)) {
    return null;
  }

  return mapUser(row);
};

export const createSession = async (userId: number) => {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);

  await db().execute(
    `INSERT INTO user_sessions (user_id, token_hash, expires_at)
     VALUES (:userId, :tokenHash, :expiresAt)`,
    {
      userId,
      tokenHash: hashToken(token),
      expiresAt
    }
  );

  return { token, expiresAt };
};

export const applySessionCookie = (response: NextResponse, token: string, expiresAt: Date) => {
  response.cookies.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
};

export const clearSessionCookie = (response: NextResponse) => {
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
};

export const getUserFromToken = async (token?: string | null) => {
  if (!token) {
    return null;
  }

  const [rows] = await db().execute<UserRow[]>(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.password_hash, u.role, u.status, u.plan_id
     FROM user_sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = :tokenHash
       AND s.expires_at > NOW()
       AND s.revoked_at IS NULL
     LIMIT 1`,
    { tokenHash: hashToken(token) }
  );

  return rows[0] ? mapUser(rows[0]) : null;
};

export const getUserFromRequest = (request: NextRequest) =>
  getUserFromToken(request.cookies.get(sessionCookieName)?.value);

export const getCurrentUser = async () => {
  const cookieStore = await cookies();

  return getUserFromToken(cookieStore.get(sessionCookieName)?.value);
};

export const revokeSession = async (token?: string | null) => {
  if (!token) {
    return;
  }

  await db().execute(
    `UPDATE user_sessions SET revoked_at = NOW()
     WHERE token_hash = :tokenHash AND revoked_at IS NULL`,
    { tokenHash: hashToken(token) }
  );
};
