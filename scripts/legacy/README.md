# Legacy deployment assets (archived — Fly.io is the production path)

These were the pre-Fly deployment options. They are **not** the production
path and are kept only for reference; git history has the full story.

| File | What it was |
| --- | --- |
| `../Dockerfile` | Old single-process API image for a VPS (superseded by `apps/api/Dockerfile`, which ships both `dist/index.js` and `dist/worker.js`). |
| `../render.yaml` | Render Blueprint: `layerflow-api` (web) + `layerflow-api-worker`. Superseded by `fly.toml` (one app, two process groups). |
| `../docker-compose.prod.yml` | Full VPS stack (nginx + certbot + api + worker + optional local PG/Redis). |
| `../docker-compose.vps.yml` | VPS variant when Caddy on the host already does SSL (port 3100). |
| `../nginx.conf` | Nginx config used by `docker-compose.prod.yml`. |
| `./scripts/deploy-vps.sh` | VPS Docker deployment helper (superseded by `../deploy-api-prod.sh`). |
| `./scripts/vps-migrate.sh` | VPS DB migration helper (migrations now run via the Fly release command). |

**Local dev is unaffected:** `docker-compose.yml` (repo root) still starts the
local Postgres + Redis.

**Production today:** `npm run deploy:api` → `fly.toml` → `apps/api/Dockerfile`.
Full guide: `docs/DEPLOYMENT.md`.