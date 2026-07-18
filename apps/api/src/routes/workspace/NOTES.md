# Workspace CRUD — implementation notes

Notes from building the workspace CRUD APIs (domains, projects, folders,
prompts + versions, sessions, files, activity). Read this before wiring the
frontend or extending these routes.

## Endpoints added

| Area | Endpoints |
|------|-----------|
| Domains | `GET/POST /api/domains`, `PATCH/DELETE /api/domains/:id` |
| Projects | `GET/POST /api/projects` (`?domainId=&status=`), `PATCH/DELETE /api/projects/:id` |
| Folders | `GET/POST /api/folders` (`?projectId=`), `PATCH/DELETE /api/folders/:id` |
| Prompts | `GET/POST /api/prompts` (filters: `domainId, projectId, folderId, tag, favorite, q, includeArchived, limit, offset`), `GET/PATCH/DELETE /api/prompts/:id` |
| Versions | `GET/POST /api/prompts/:id/versions`, `GET /api/prompts/:id/versions/:versionId`, `POST /api/prompts/:id/restore/:versionId` |
| Sessions | `GET/POST /api/sessions` (`?projectId=&domainId=&status=`), `GET/PATCH/DELETE /api/sessions/:id`, `POST /api/sessions/:id/messages` |
| Files | `POST /api/files/upload-url`, `PUT/GET /api/files/:id/content` (local dev), `POST /api/files/complete`, `GET /api/files/:id/download-url`, `DELETE /api/files/:id` |
| Activity | `GET /api/activity` (`?limit=&offset=`) |

All request/response shapes are zod schemas in `@layerflow/contracts`
(`domain.ts`, `project.ts`, `folder.ts`, `prompt.ts`, `session.ts`, `file.ts`,
`activity.ts`).

## Delete / archive semantics (decisions)

- **Domains** — `DELETE` is a hard delete but returns `409 domain_not_empty`
  while any project still points at the domain. Move/delete projects first.
  (Prompts referencing the domain survive; `prompts.domain_id` is `SET NULL`.)
- **Projects** — `PATCH { status: "archived" | "active" }` is the recoverable
  path. `DELETE` is permanent: folders cascade away, prompts survive with
  `projectId = null`.
- **Folders** — `DELETE` is permanent and cascades to child folders; prompts
  inside get `folderId = null`.
- **Prompts** — `PATCH { archived: true/false }` sets/clears `archivedAt`
  (archived prompts are hidden from lists unless `includeArchived=true`).
  `DELETE` is permanent and cascades versions/tags/attachments/favorites.
- **Sessions** — `DELETE` is permanent; messages cascade.

## Versioning invariants

- Prompt **bodies are never edited in place**. `PATCH /api/prompts/:id`
  handles metadata only; a body change is `POST /api/prompts/:id/versions`.
- Version numbers are `max(version) + 1` computed inside a transaction;
  `prompts.currentVersionId` always points at the newest version.
- **Restore** copies the old snapshot into a *new* version (note
  `"Restored from vN"`); history is append-only.

## Favorites and tags

- `prompt.favorite` in responses is **per-user** (a row in `favorites` for the
  session user), not a column on `prompts`. `PATCH { favorite: true/false }`
  inserts/deletes that row.
- `PATCH { tags: [...] }` replaces the full tag set (delete + insert).

## Files: local storage fallback

- R2 signing is **not implemented**. When `R2_*` env vars are set,
  `POST /api/files/upload-url` returns `501 r2_not_implemented` — the
  integration agent should add the S3 SDK signer there
  (`src/routes/files/files.ts` + `src/services/files/storage.ts`).
- Without R2 env (local dev/tests), bytes live under `apps/api/.data/uploads/`
  and the "signed URL" is a cookie-authenticated `PUT/GET
  /api/files/:id/content` on this API. Flow: `upload-url` → `PUT` bytes →
  `complete` (optionally attaches to a prompt via `prompt_attachments`).
- `sizeBytes`/`checksum` are recomputed server-side from the uploaded bytes.

## Activity feed

- `recordActivity()` (`src/services/workspace/activity.ts`) is best-effort:
  failures are logged, never thrown. Events written: `domain.created`,
  `project.created`, `project.updated`, `prompt.created`, `prompt.updated`,
  `prompt.version_created`, `prompt.restored`, `session.created`.

## Schema quirks hit

- `prompts.currentVersionId` has **no FK** (documented circular-constraint
  workaround), so it's set in the same transaction as the version insert.
- Drizzle rejects an empty `.set({})` — favorite-only / tag-only prompt
  patches skip the `prompts` row update (see the guard in
  `routes/prompts/prompts.ts`).
- `session_messages.position` starts at 0 and is `max + 1` per session,
  assigned in a transaction.
- No schema changes were needed; no new migration was generated.

## Tests

- `src/test/workspace-crud.test.ts` covers all areas incl. tenancy isolation
  (foreign workspace access is a 404, never a leak). Uses the same
  docker-Postgres-or-PGlite bootstrap as `integration.test.ts` — each vitest
  file runs in its own worker, so the bootstrap is duplicated by design.
- Seed (`npm run db:seed`) now also creates a "Resume Builder" session with 3
  messages and two activity events.
