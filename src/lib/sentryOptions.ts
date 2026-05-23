import type { Event, EventHint } from "@sentry/nextjs";

export function publicSentryDsn(): string | undefined {
  return process.env.NEXT_PUBLIC_SENTRY_DSN;
}

export function serverSentryDsn(): string | undefined {
  return process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
}

export function normalizeSentryEnvironment(): string | undefined {
  return process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV;
}

export function normalizePublicSentryEnvironment(): string | undefined {
  return process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV;
}

export function normalizeSentryRelease(): string | undefined {
  return process.env.SENTRY_RELEASE ?? process.env.NEXT_PUBLIC_SENTRY_RELEASE;
}

export function normalizePublicSentryRelease(): string | undefined {
  return process.env.NEXT_PUBLIC_SENTRY_RELEASE;
}

export function scrubSentryEvent<T extends Event>(
  event: T,
  _hint: EventHint,
): T | null {
  if (event.request) {
    delete event.request.headers;
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.query_string;

    if (event.request.url) {
      try {
        const url = new URL(event.request.url);
        url.search = "";
        event.request.url = url.toString();
      } catch {
        event.request.url = event.request.url.split("?")[0];
      }
    }
  }

  return event;
}
