import type { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

export const getRequestUserId = async (request: NextRequest) => {
  const user = await getUserFromRequest(request);

  if (!user) {
    return null;
  }

  return user.id;
};
