import { requireAuthToken } from "@/lib/routePreload";
import ExploreClient from "./ExploreClient";

export default async function ExplorePage() {
  await requireAuthToken();

  return <ExploreClient />;
}
