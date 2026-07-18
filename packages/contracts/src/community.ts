import { z } from "zod";
import { idSchema, timestampSchema } from "./common";

// ── Collections ───────────────────────────────────────────────────────────────

export const collectionVisibilitySchema = z.enum(["private", "unlisted", "public"]);
export type CollectionVisibility = z.infer<typeof collectionVisibilitySchema>;

export const collectionSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  ownerUserId: idSchema,
  title: z.string(),
  description: z.string().nullish(),
  visibility: collectionVisibilitySchema,
  itemCount: z.number().int().nonnegative(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type Collection = z.infer<typeof collectionSchema>;

export const collectionItemSchema = z.object({
  id: idSchema,
  collectionId: idSchema,
  promptId: idSchema,
  promptTitle: z.string(),
  sortOrder: z.number().int(),
  createdAt: timestampSchema,
});
export type CollectionItem = z.infer<typeof collectionItemSchema>;

/** POST /api/collections */
export const createCollectionRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1_000).optional(),
  visibility: collectionVisibilitySchema.default("private"),
});
export type CreateCollectionRequest = z.infer<typeof createCollectionRequestSchema>;

/** PATCH /api/collections/:id */
export const updateCollectionRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1_000).nullable().optional(),
  visibility: collectionVisibilitySchema.optional(),
});
export type UpdateCollectionRequest = z.infer<typeof updateCollectionRequestSchema>;

export const collectionResponseSchema = z.object({ collection: collectionSchema });
export type CollectionResponse = z.infer<typeof collectionResponseSchema>;

export const listCollectionsResponseSchema = z.object({
  collections: z.array(collectionSchema),
});
export type ListCollectionsResponse = z.infer<typeof listCollectionsResponseSchema>;

export const collectionDetailResponseSchema = z.object({
  collection: collectionSchema,
  items: z.array(collectionItemSchema),
});
export type CollectionDetailResponse = z.infer<typeof collectionDetailResponseSchema>;

/** POST /api/collections/:id/items */
export const addCollectionItemRequestSchema = z.object({
  promptId: idSchema,
  sortOrder: z.number().int().min(0).optional(),
});
export type AddCollectionItemRequest = z.infer<typeof addCollectionItemRequestSchema>;

// ── Profiles ──────────────────────────────────────────────────────────────────

export const profileSchema = z.object({
  id: idSchema,
  userId: idSchema,
  handle: z.string(),
  displayName: z.string(),
  bio: z.string().nullish(),
  avatarUrl: z.string().nullish(),
  followerCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  createdAt: timestampSchema,
});
export type Profile = z.infer<typeof profileSchema>;

/** PATCH /api/profiles/me (also creates the profile on first call). */
export const updateProfileRequestSchema = z.object({
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_-]+$/, "lowercase letters, numbers, - and _ only")
    .optional(),
  displayName: z.string().min(1).max(80).optional(),
  bio: z.string().max(500).nullable().optional(),
  avatarUrl: z.url().nullable().optional(),
});
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;

export const profileResponseSchema = z.object({ profile: profileSchema });
export type ProfileResponse = z.infer<typeof profileResponseSchema>;

// ── Follows / likes / comments ────────────────────────────────────────────────

export const likeSubjectTypeSchema = z.enum(["prompt", "collection", "comment"]);
export type LikeSubjectType = z.infer<typeof likeSubjectTypeSchema>;

export const commentSubjectTypeSchema = z.enum(["prompt", "collection"]);
export type CommentSubjectType = z.infer<typeof commentSubjectTypeSchema>;

/** POST /api/likes and DELETE /api/likes */
export const likeRequestSchema = z.object({
  subjectType: likeSubjectTypeSchema,
  subjectId: idSchema,
});
export type LikeRequest = z.infer<typeof likeRequestSchema>;

export const likeStatusResponseSchema = z.object({
  liked: z.boolean(),
  likeCount: z.number().int().nonnegative(),
});
export type LikeStatusResponse = z.infer<typeof likeStatusResponseSchema>;

export const commentSchema = z.object({
  id: idSchema,
  userId: idSchema,
  subjectType: commentSubjectTypeSchema,
  subjectId: idSchema,
  body: z.string(),
  createdAt: timestampSchema,
});
export type Comment = z.infer<typeof commentSchema>;

/** POST /api/comments */
export const createCommentRequestSchema = z.object({
  subjectType: commentSubjectTypeSchema,
  subjectId: idSchema,
  body: z.string().min(1).max(5_000),
});
export type CreateCommentRequest = z.infer<typeof createCommentRequestSchema>;

export const commentResponseSchema = z.object({ comment: commentSchema });
export type CommentResponse = z.infer<typeof commentResponseSchema>;

export const listCommentsResponseSchema = z.object({
  comments: z.array(commentSchema),
});
export type ListCommentsResponse = z.infer<typeof listCommentsResponseSchema>;

export const followResponseSchema = z.object({
  following: z.boolean(),
  followerCount: z.number().int().nonnegative(),
});
export type FollowResponse = z.infer<typeof followResponseSchema>;

// ── Prompt clone ──────────────────────────────────────────────────────────────

/** POST /api/prompts/:id/clone */
export const clonePromptResponseSchema = z.object({
  prompt: z.object({
    id: idSchema,
    workspaceId: idSchema,
    title: z.string(),
    currentVersionId: idSchema.nullish(),
  }),
  sourcePromptId: idSchema,
});
export type ClonePromptResponse = z.infer<typeof clonePromptResponseSchema>;

// ── Notifications ─────────────────────────────────────────────────────────────

export const notificationSchema = z.object({
  id: idSchema,
  type: z.string(),
  title: z.string(),
  body: z.string().nullish(),
  data: z.unknown().nullish(),
  readAt: timestampSchema.nullish(),
  createdAt: timestampSchema,
});
export type Notification = z.infer<typeof notificationSchema>;

export const listNotificationsResponseSchema = z.object({
  notifications: z.array(notificationSchema),
  unreadCount: z.number().int().nonnegative(),
});
export type ListNotificationsResponse = z.infer<typeof listNotificationsResponseSchema>;

/** POST /api/notifications/read — mark some (or all) notifications read. */
export const markNotificationsReadRequestSchema = z.object({
  ids: z.array(idSchema).max(100).optional(),
  all: z.boolean().optional(),
});
export type MarkNotificationsReadRequest = z.infer<typeof markNotificationsReadRequestSchema>;

export const markNotificationsReadResponseSchema = z.object({
  updated: z.number().int().nonnegative(),
});
export type MarkNotificationsReadResponse = z.infer<typeof markNotificationsReadResponseSchema>;
