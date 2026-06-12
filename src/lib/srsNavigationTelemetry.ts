import * as Sentry from "@sentry/nextjs";
import {
  consumeSrsNavigationStart,
  SRS_NAV_SLOW_THRESHOLD_MS,
} from "./srsNavigationTiming";

function isPwaStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function reportSlowSrsNavigation() {
  const start = consumeSrsNavigationStart();
  if (start === null) return;

  const elapsedMs = performance.now() - start;
  if (elapsedMs <= SRS_NAV_SLOW_THRESHOLD_MS) return;

  Sentry.captureMessage("Slow SRS navigation", {
    level: "warning",
    tags: {
      surface: "srs",
      source: "home_start_review",
    },
    extra: {
      elapsedMs: Math.round(elapsedMs),
      pwaStandalone: isPwaStandalone(),
    },
  });
}
