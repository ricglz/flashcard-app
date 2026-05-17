import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";

export async function getAuthToken() {
  const token = await (await auth()).getToken();
  if (!token) {
    const h = await headers();
    console.warn(
      "[auth] no token —",
      h.get("x-clerk-auth-reason") ?? "unknown reason",
    );
  }
  return token ?? undefined;
}
