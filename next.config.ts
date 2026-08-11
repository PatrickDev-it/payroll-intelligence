import type { NextConfig } from "next";

const development = process.env["NODE_ENV"] !== "production";
const releaseId =
  process.env["PAYROLL_RELEASE"] ?? process.env["VERCEL_GIT_COMMIT_SHA"] ?? "local";
const publicReleaseId = process.env["NEXT_PUBLIC_PAYROLL_RELEASE"] ?? releaseId;
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self'${development ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  ...(development
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  env: {
    NEXT_PUBLIC_PAYROLL_RELEASE: publicReleaseId,
  },
  generateBuildId: async () => releaseId,
  headers: async () => [
    { source: "/:path*", headers: securityHeaders },
    {
      source: "/",
      headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
    },
    {
      source: "/api/:path*",
      headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
    },
  ],
};

export default nextConfig;
