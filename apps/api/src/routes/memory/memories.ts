import { Hono } from "hono";
import {
  createMemoryRequestSchema,
  paginationQuerySchema,
  updateMemoryRequestSchema,
  type ListMemoriesResponse,
  type MemoryResponse,
  type MemorySearchResponse,
} from "@layerflow/contracts";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import {
  createMemory,
  deleteMemory,
  getMemory,
  listMemories,
  searchMemories,
  updateMemory,
} from "../../services/memory/memory";
import type { AppEnv } from "../../types";

export const memoryRouter = new Hono<AppEnv>();
memoryRouter.use(requireAuth);

const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// GET /api/memory/search?q=  (registered before /:id so "search" isn't captured)
memoryRouter.get("/search", async (c) => {
  const workspaceId = c.get("workspaceId");
  const query = searchQuerySchema.parse(c.req.query());
  const { results, semanticUsed, embeddingModel } = await searchMemories(
    workspaceId,
    query.q,
    query.limit,
  );
  const response: MemorySearchResponse = {
    query: query.q,
    results,
    semanticUsed,
    embeddingModel,
  };
  return c.json(response);
});

// GET /api/memory
memoryRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const { limit, offset } = paginationQuerySchema.parse(c.req.query());
  const memories = await listMemories(workspaceId, limit, offset);
  const response: ListMemoriesResponse = { memories };
  return c.json(response);
});

// POST /api/memory
memoryRouter.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const userId = c.get("userId");
  const body = createMemoryRequestSchema.parse(await c.req.json());
  const memory = await createMemory(workspaceId, userId, body);
  const response: MemoryResponse = { memory };
  return c.json(response, 201);
});

// GET /api/memory/:id
memoryRouter.get("/:id", async (c) => {
  const memory = await getMemory(c.get("workspaceId"), c.req.param("id"));
  const response: MemoryResponse = { memory };
  return c.json(response);
});

// PATCH /api/memory/:id
memoryRouter.patch("/:id", async (c) => {
  const body = updateMemoryRequestSchema.parse(await c.req.json());
  const memory = await updateMemory(c.get("workspaceId"), c.req.param("id"), body);
  const response: MemoryResponse = { memory };
  return c.json(response);
});

// DELETE /api/memory/:id
memoryRouter.delete("/:id", async (c) => {
  await deleteMemory(c.get("workspaceId"), c.req.param("id"));
  return c.body(null, 204);
});
