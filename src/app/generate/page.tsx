import { redirect } from "next/navigation";
import { preloadQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { getAuthToken } from "@/lib/server";
import GenerateClient from "./GenerateClient";

export default async function GeneratePage() {
  const token = await getAuthToken();
  if (!token) redirect("/");

  const preloadedSets = await preloadQuery(
    api.flashcardSets.list,
    {},
    { token },
  );

  return <GenerateClient preloadedSets={preloadedSets} />;
}
