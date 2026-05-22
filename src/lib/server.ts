import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";

export async function getAuthToken() {
  const authData = await auth();
  const token =
    authData.sessionClaims?.aud === "convex"
      ? await authData.getToken()
      : await authData.getToken({ template: "convex" });
  if (!token) {
    const h = await headers();
    console.warn(
      "[auth] no token —",
      h.get("x-clerk-auth-reason") ?? "unknown reason",
    );
  }
  return token ?? undefined;
}
