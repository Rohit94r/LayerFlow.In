/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Note: do not put `better-auth` here. Externalizing it makes
  // `better-auth/react` load a separate React copy during SSR, which crashes
  // hooks with "Cannot read properties of null (reading 'useRef')".
  serverExternalPackages: [
    "pg",
    "drizzle-orm",
    "@better-auth/drizzle-adapter",
    "ioredis",
    "bullmq",
    "hono",
    "pino",
    "@sentry/node",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
  ],
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // Serve terminal/scripts/install.sh at https://layerflow.dev/install.
  // Force-include it in the serverless bundle so the route never 404s on Vercel.
  outputFileTracingIncludes: {
    "/install": ["./terminal/scripts/install.sh"],
    "/install.sh": ["./terminal/scripts/install.sh"],
  },
};

export default nextConfig;
