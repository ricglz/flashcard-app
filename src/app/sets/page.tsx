import { redirect } from "next/navigation";
import { preloadQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { getAuthToken } from "@/lib/server";
import SetsClient from "./SetsClient";

export default async function SetsPage() {
  const token = await getAuthToken();
  if (!token) redirect("/");

  const preloadedSets = await preloadQuery(
    api.flashcardSets.list,
    {},
    { token },
  );

  return <SetsClient preloadedSets={preloadedSets} />;
}
