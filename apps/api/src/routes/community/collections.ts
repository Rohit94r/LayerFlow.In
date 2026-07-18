import { Hono } from "hono";
import {
  addCollectionItemRequestSchema,
  createCollectionRequestSchema,
  updateCollectionRequestSchema,
  type CollectionDetailResponse,
  type CollectionResponse,
  type ListCollectionsResponse,
} from "@layerflow/contracts";
import { requireAuth } from "../../middleware/auth";
import {
  addCollectionItem,
  createCollection,
  deleteCollection,
  getCollection,
  listCollections,
  removeCollectionItem,
  updateCollection,
} from "../../services/community/collections";
import type { AppEnv } from "../../types";

export const collectionsRouter = new Hono<AppEnv>();
collectionsRouter.use(requireAuth);

// GET /api/collections
collectionsRouter.get("/", async (c) => {
  const collections = await listCollections(c.get("workspaceId"));
  const response: ListCollectionsResponse = { collections };
  return c.json(response);
});

// POST /api/collections
collectionsRouter.post("/", async (c) => {
  const body = createCollectionRequestSchema.parse(await c.req.json());
  const collection = await createCollection(
    c.get("workspaceId"),
    c.get("userId"),
    body,
  );
  const response: CollectionResponse = { collection };
  return c.json(response, 201);
});

// GET /api/collections/:id
collectionsRouter.get("/:id", async (c) => {
  const detail = await getCollection(c.get("workspaceId"), c.req.param("id"));
  const response: CollectionDetailResponse = detail;
  return c.json(response);
});

// PATCH /api/collections/:id
collectionsRouter.patch("/:id", async (c) => {
  const body = updateCollectionRequestSchema.parse(await c.req.json());
  const collection = await updateCollection(
    c.get("workspaceId"),
    c.get("userId"),
    c.req.param("id"),
    body,
  );
  const response: CollectionResponse = { collection };
  return c.json(response);
});

// DELETE /api/collections/:id
collectionsRouter.delete("/:id", async (c) => {
  await deleteCollection(c.get("workspaceId"), c.get("userId"), c.req.param("id"));
  return c.body(null, 204);
});

// POST /api/collections/:id/items
collectionsRouter.post("/:id/items", async (c) => {
  const body = addCollectionItemRequestSchema.parse(await c.req.json());
  const item = await addCollectionItem(
    c.get("workspaceId"),
    c.get("userId"),
    c.req.param("id"),
    body,
  );
  return c.json({ item }, 201);
});

// DELETE /api/collections/:id/items/:itemId
collectionsRouter.delete("/:id/items/:itemId", async (c) => {
  await removeCollectionItem(
    c.get("workspaceId"),
    c.get("userId"),
    c.req.param("id"),
    c.req.param("itemId"),
  );
  return c.body(null, 204);
});
