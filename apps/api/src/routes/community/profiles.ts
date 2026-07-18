import { Hono } from "hono";
import {
  updateProfileRequestSchema,
  type FollowResponse,
  type ProfileResponse,
} from "@layerflow/contracts";
import { requireAuth } from "../../middleware/auth";
import {
  followUser,
  getMyProfile,
  getProfileByUserId,
  unfollowUser,
  updateMyProfile,
} from "../../services/community/profiles";
import type { AppEnv } from "../../types";

export const profilesRouter = new Hono<AppEnv>();
profilesRouter.use(requireAuth);

// GET /api/profiles/me
profilesRouter.get("/me", async (c) => {
  const profile = await getMyProfile(c.get("userId"));
  const response: ProfileResponse = { profile };
  return c.json(response);
});

// PATCH /api/profiles/me
profilesRouter.patch("/me", async (c) => {
  const body = updateProfileRequestSchema.parse(await c.req.json());
  const profile = await updateMyProfile(c.get("userId"), body);
  const response: ProfileResponse = { profile };
  return c.json(response);
});

// GET /api/profiles/:userId
profilesRouter.get("/:userId", async (c) => {
  const profile = await getProfileByUserId(c.req.param("userId"));
  const response: ProfileResponse = { profile };
  return c.json(response);
});

export const followsRouter = new Hono<AppEnv>();
followsRouter.use(requireAuth);

// POST /api/follows/:userId
followsRouter.post("/:userId", async (c) => {
  const result = await followUser(c.get("userId"), c.req.param("userId"));
  const response: FollowResponse = result;
  return c.json(response, 201);
});

// DELETE /api/follows/:userId
followsRouter.delete("/:userId", async (c) => {
  const result = await unfollowUser(c.get("userId"), c.req.param("userId"));
  const response: FollowResponse = result;
  return c.json(response);
});
