import { redirect } from "next/navigation";
import { getAuthToken } from "@/lib/server";
import GenerateClient from "./GenerateClient";

export default async function GeneratePage() {
  const token = await getAuthToken();
  if (!token) redirect("/");

  return <GenerateClient />;
}
