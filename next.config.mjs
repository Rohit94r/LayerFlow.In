/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: [
    "pg",
    "drizzle-orm",
    "better-auth",
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
};

export default nextConfig;
