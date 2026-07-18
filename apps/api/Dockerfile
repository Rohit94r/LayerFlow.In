# syntax=docker/dockerfile:1
#
# Production image for the LayerFlow API (apps/api) — serves BOTH the Hono HTTP
# API (`dist/index.js`) and the BullMQ worker (`dist/worker.js`) from one image.
# The process to run is chosen per Fly process group in fly.toml.
#
# IMPORTANT: build with the repository ROOT as the build context, because this
# is an npm workspaces monorepo and apps/api bundles @layerflow/contracts and
# @layerflow/model-registry from packages/. Fly.io does this automatically when
# fly.toml sets `build.dockerfile = "apps/api/Dockerfile"`.
#
#   docker build -f apps/api/Dockerfile -t layerflow-api .   # run from repo root

# ---------- 1. builder: install ALL deps and compile ----------
FROM node:22-slim AS builder
WORKDIR /app

# Copy only manifests first so `npm ci` is cached until a dependency changes.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/model-registry/package.json ./packages/model-registry/

# Full install (includes dev deps: tsup, drizzle-kit, tsx) for the build + release step.
RUN npm ci

# Copy sources needed to build the API bundle.
COPY tsconfig.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Produces apps/api/dist/index.js and apps/api/dist/worker.js (ESM, node22).
RUN npm run build --workspace @layerflow/api

# ---------- 2. runtime ----------
FROM node:22-slim AS runtime
ENV NODE_ENV=production
ENV PORT=8787
WORKDIR /app

# node_modules (with drizzle-kit + tsx kept, so release migrations work),
# the compiled bundle, migration SQL, and the drizzle config all come from the
# builder stage. Keeping dev deps here is a deliberate trade-off: it makes
# `npm run db:migrate` usable as the Fly release_command without a second image.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=builder /app/apps/api/drizzle.config.ts ./apps/api/drizzle.config.ts
COPY --from=builder /app/apps/api/src ./apps/api/src

# Drop root privileges (the `node` user ships with the base image).
USER node

EXPOSE 8787

# Lightweight container-level liveness probe (Fly also health-checks via fly.toml).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Default command runs the API; the worker process overrides this in fly.toml.
CMD ["node", "apps/api/dist/index.js"]
