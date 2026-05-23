import * as Sentry from "@sentry/nextjs";
import {
  normalizePublicSentryEnvironment,
  normalizePublicSentryRelease,
  publicSentryDsn,
  scrubSentryEvent,
} from "@/lib/sentryOptions";

const dsn = publicSentryDsn();

if (dsn) {
  Sentry.init({
    dsn,
    environment: normalizePublicSentryEnvironment(),
    release: normalizePublicSentryRelease(),
    sendDefaultPii: false,
    beforeSend: scrubSentryEvent,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
