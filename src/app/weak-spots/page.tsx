import { redirect } from "next/navigation";
import { getAuthToken } from "@/lib/server";
import WeakSpotsClient from "./WeakSpotsClient";

export default async function WeakSpotsPage() {
  const token = await getAuthToken();
  if (!token) redirect("/");

  return <WeakSpotsClient />;
}
