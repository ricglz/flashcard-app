"use client";

import type { Preloaded } from "convex/react";
import type { api } from "../../../convex/_generated/api";
import type { ActiveSrsReviewSession } from "./srsReviewTypes";
import SrsReviewActiveScreen from "./SrsReviewActiveScreen";
import SrsReviewCompleteScreen from "./SrsReviewCompleteScreen";
import SrsReviewReconnectingScreen from "./SrsReviewReconnectingScreen";
import { useSrsReviewSessionController } from "./useSrsReviewSessionController";

type SrsReviewScreenProps = {
  session: ActiveSrsReviewSession;
  preloadedTtsConfig: Preloaded<typeof api.userSettings.getTtsConfig>;
};

export default function SrsReviewScreen({
  session,
  preloadedTtsConfig,
}: SrsReviewScreenProps) {
  const controller = useSrsReviewSessionController(session);

  switch (controller.state.status) {
    case "complete":
      return (
        <SrsReviewCompleteScreen
          screenState={controller.state}
        />
      );
    case "reconnecting":
      return <SrsReviewReconnectingScreen />;
    case "active": {
      return (
        <SrsReviewActiveScreen
          state={controller.state}
          data={controller.data}
          preloadedTtsConfig={preloadedTtsConfig}
        />
      );
    }
  }
}
