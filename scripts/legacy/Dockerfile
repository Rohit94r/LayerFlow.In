# LayerFlow: single production image for 2GB VPS
# Multi-stage build keeps the runtime image under 150MB.
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/tsup.config.ts apps/api/tsconfig.json ./apps/api/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/model-registry/package.json ./packages/model-registry/

RUN npm install

FROM deps AS build
WORKDIR /app
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN npm run build --workspace @layerflow/api

FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache curl ca-certificates tzdata

# Copy the fully-built dependency tree (includes every @layerflow/api prod
# dependency: @sentry/node, pg, hono, ioredis, ...) from the build stage.
# The root package.json only declares frontend deps, so a fresh `npm install`
# here would NOT install the API deps and the bundle would crash at boot with
# ERR_MODULE_NOT_FOUND (e.g. @sentry/node).
COPY --from=build /app/node_modules ./node_modules

COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/drizzle ./drizzle

HEALTHCHECK --interval=60s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -sf http://localhost:8787/health/live || exit 1

EXPOSE 8787
CMD ["node", "--max-old-space-size=512", "dist/index.js"]
