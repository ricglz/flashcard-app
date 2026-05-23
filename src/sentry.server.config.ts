import * as Sentry from "@sentry/nextjs";
import {
  normalizeSentryEnvironment,
  normalizeSentryRelease,
  serverSentryDsn,
  scrubSentryEvent,
} from "@/lib/sentryOptions";

const dsn = serverSentryDsn();

if (dsn) {
  Sentry.init({
    dsn,
    environment: normalizeSentryEnvironment(),
    release: normalizeSentryRelease(),
    sendDefaultPii: false,
    beforeSend: scrubSentryEvent,
  });
}
