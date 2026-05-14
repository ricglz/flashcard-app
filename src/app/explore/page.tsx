import { redirect } from "next/navigation";
import { getAuthToken } from "@/lib/server";
import ExploreClient from "./ExploreClient";

export default async function ExplorePage() {
  const token = await getAuthToken();
  if (!token) redirect("/");

  return <ExploreClient />;
}
