import type { NextRequest } from "next/server";

export const getRequestUserId = (request: NextRequest) => {
  const rawUserId = request.headers.get("x-flowconnect-user-id");
  const userId = Number(rawUserId);

  if (!Number.isInteger(userId) || userId < 1) {
    return null;
  }

  return userId;
};
