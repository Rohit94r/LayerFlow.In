import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { getEnv } from "./config/env";
import { logger } from "./config/logger";

const env = getEnv(); // fails fast with a clear message if env is invalid
const app = createApp();

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info(`LayerFlow API listening on http://localhost:${info.port}`);
});
