import { Hono } from "hono";
import {
  searchQuerySchema,
  similarQuerySchema,
  type SearchResponse,
  type SimilarResponse,
} from "@layerflow/contracts";
import { requireAuth } from "../../middleware/auth";
import { keywordSearch } from "../../services/search/keyword";
import { findSimilar } from "../../services/search/similar";
import type { AppEnv } from "../../types";

export const searchRouter = new Hono<AppEnv>();
searchRouter.use(requireAuth);

// GET /api/search?q=&type=prompt|session|all
searchRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const query = searchQuerySchema.parse(c.req.query());
  const results = await keywordSearch({
    workspaceId,
    query: query.q,
    type: query.type,
    limit: query.limit,
  });
  const response: SearchResponse = { query: query.q, results };
  return c.json(response);
});

export const similarRouter = new Hono<AppEnv>();
similarRouter.use(requireAuth);

// GET /api/similar?promptId= or ?text=
similarRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const query = similarQuerySchema.parse(c.req.query());
  const { results, embeddingModel } = await findSimilar({
    workspaceId,
    promptId: query.promptId,
    text: query.text,
    limit: query.limit,
  });
  const response: SimilarResponse = { results, embeddingModel };
  return c.json(response);
});
