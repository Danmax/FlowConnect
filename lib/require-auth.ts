import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const requireCurrentUser = async () => {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signup");
  }

  return user;
};
