import { Hono } from "hono";
import {
  createProviderKeyRequestSchema,
  type CreateProviderKeyResponse,
  type DeleteProviderKeyResponse,
  type ListProviderKeysResponse,
} from "@layerflow/contracts";
import { requireAuth } from "../../middleware/auth";
import {
  createProviderKey,
  listProviderKeys,
  revokeProviderKey,
} from "../../services/keys/provider-keys";
import type { AppEnv } from "../../types";

export const providerKeysRouter = new Hono<AppEnv>();
providerKeysRouter.use(requireAuth);

// POST /api/provider-keys
providerKeysRouter.post("/", async (c) => {
  const body = createProviderKeyRequestSchema.parse(await c.req.json());
  const key = await createProviderKey(c.get("workspaceId"), body);
  const response: CreateProviderKeyResponse = { key };
  return c.json(response, 201);
});

// GET /api/provider-keys
providerKeysRouter.get("/", async (c) => {
  const keys = await listProviderKeys(c.get("workspaceId"));
  const response: ListProviderKeysResponse = { keys };
  return c.json(response);
});

// DELETE /api/provider-keys/:id
providerKeysRouter.delete("/:id", async (c) => {
  await revokeProviderKey(c.get("workspaceId"), c.req.param("id"));
  const response: DeleteProviderKeyResponse = { id: c.req.param("id"), revoked: true };
  return c.json(response);
});
