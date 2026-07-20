import { and, eq, isNull } from "drizzle-orm";
import type { ApiKey, CreateApiKeyRequest } from "@layerflow/contracts";
import { db } from "../../db/client";
import { apiKeys } from "../../db/schema/gateway";
import { AppError } from "../../middleware/app-error";
import { generateApiKey, hashApiKey } from "../crypto";

function toApiKeyDto(row: typeof apiKeys.$inferSelect): ApiKey {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    keyPrefix: row.keyPrefix,
    projectId: row.projectId,
    dailyRequestCap: row.dailyRequestCap,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createWorkspaceApiKey(
  workspaceId: string,
  body: CreateApiKeyRequest,
): Promise<{ key: ApiKey; secret: string }> {
  const { secret, prefix } = generateApiKey();
  const [row] = await db
    .insert(apiKeys)
    .values({
      workspaceId,
      name: body.name,
      keyHash: hashApiKey(secret),
      keyPrefix: prefix,
      projectId: body.projectId ?? null,
      dailyRequestCap: body.dailyRequestCap ?? null,
    })
    .returning();
  return { key: toApiKeyDto(row), secret };
}

export async function listWorkspaceApiKeys(workspaceId: string): Promise<ApiKey[]> {
  const rows = await db.query.apiKeys.findMany({
    where: (k, { and, eq, isNull }) => and(eq(k.workspaceId, workspaceId), isNull(k.revokedAt)),
    orderBy: (k, { desc }) => [desc(k.createdAt)],
  });
  return rows.map(toApiKeyDto);
}

export async function revokeWorkspaceApiKey(
  workspaceId: string,
  keyId: string,
): Promise<ApiKey> {
  const [row] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(apiKeys.id, keyId), eq(apiKeys.workspaceId, workspaceId), isNull(apiKeys.revokedAt)),
    )
    .returning();
  if (!row) throw new AppError(404, "not_found", "API key not found");
  return toApiKeyDto(row);
}

/** Look up a non-revoked key by presented secret. */
export async function findApiKeyBySecret(secret: string) {
  const keyHash = hashApiKey(secret);
  return db.query.apiKeys.findFirst({
    where: (k, { and, eq, isNull }) => and(eq(k.keyHash, keyHash), isNull(k.revokedAt)),
  });
}

export async function touchApiKeyLastUsed(keyId: string): Promise<void> {
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, keyId));
}
