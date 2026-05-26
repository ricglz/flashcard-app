import type { NextConfig } from "next";
import { withSentryConfig, type SentryBuildOptions } from "@sentry/nextjs";

const publicSentryEnvironment =
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.SENTRY_ENVIRONMENT;
const publicSentryRelease =
  process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? process.env.SENTRY_RELEASE;
const canUploadSentrySourceMaps =
  Boolean(process.env.SENTRY_ORG) &&
  Boolean(process.env.SENTRY_PROJECT) &&
  Boolean(process.env.SENTRY_AUTH_TOKEN);

const nextConfig: NextConfig = {
  turbopack: {},
  reactCompiler: true,
  env: {
    ...(publicSentryEnvironment
      ? { NEXT_PUBLIC_SENTRY_ENVIRONMENT: publicSentryEnvironment }
      : {}),
    ...(publicSentryRelease
      ? { NEXT_PUBLIC_SENTRY_RELEASE: publicSentryRelease }
      : {}),
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
};

const sentryBuildOptions: SentryBuildOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  telemetry: false,
  silent: !canUploadSentrySourceMaps || !process.env.CI,
  sourcemaps: {
    disable: !canUploadSentrySourceMaps,
  },
  release: {
    name: process.env.SENTRY_RELEASE,
    create: canUploadSentrySourceMaps,
    finalize: canUploadSentrySourceMaps,
  },
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
};

export default withSentryConfig(nextConfig, sentryBuildOptions);
