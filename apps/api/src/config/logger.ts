import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  // Never log credentials, even by accident.
  redact: ["req.headers.authorization", "req.headers.cookie", "*.apiKey", "*.ciphertext"],
  transport: isDev ? { target: "pino-pretty", options: { colorize: true } } : undefined,
});
