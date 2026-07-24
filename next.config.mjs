/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
};

export default nextConfig;
