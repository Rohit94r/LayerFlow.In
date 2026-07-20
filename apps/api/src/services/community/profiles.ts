import { and, eq, sql } from "drizzle-orm";
import type { Profile, UpdateProfileRequest } from "@layerflow/contracts";
import { db } from "../../db/client";
import { follows, profiles } from "../../db/schema/community";
import { AppError } from "../../middleware/app-error";

async function followerCounts(userId: string): Promise<{
  followerCount: number;
  followingCount: number;
}> {
  const [followers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(follows)
    .where(eq(follows.followedUserId, userId));
  const [following] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(follows)
    .where(eq(follows.followerUserId, userId));
  return {
    followerCount: Number(followers?.count ?? 0),
    followingCount: Number(following?.count ?? 0),
  };
}

export async function toProfileDto(row: typeof profiles.$inferSelect): Promise<Profile> {
  const counts = await followerCounts(row.userId);
  return {
    id: row.id,
    userId: row.userId,
    handle: row.handle,
    displayName: row.displayName,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    followerCount: counts.followerCount,
    followingCount: counts.followingCount,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Default handle from the user's name/email — unique-ish for first-time create. */
function defaultHandle(userId: string, name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20);
  const suffix = userId.replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase();
  return `${base || "user"}-${suffix}`;
}

/** Ensure the current user has a profile row (lazy create on first /me call). */
export async function ensureProfile(userId: string): Promise<typeof profiles.$inferSelect> {
  const existing = await db.query.profiles.findFirst({
    where: (p, { eq }) => eq(p.userId, userId),
  });
  if (existing) return existing;

  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
  });
  if (!user) throw new AppError(404, "not_found", "User not found");

  const handle = defaultHandle(userId, user.name);
  try {
    const [row] = await db
      .insert(profiles)
      .values({
        userId,
        handle,
        displayName: user.name,
        avatarUrl: user.image,
      })
      .returning();
    return row;
  } catch {
    // Race: another request created it first.
    const again = await db.query.profiles.findFirst({
      where: (p, { eq }) => eq(p.userId, userId),
    });
    if (!again) throw new AppError(500, "internal_error", "Could not create profile");
    return again;
  }
}

export async function getMyProfile(userId: string): Promise<Profile> {
  const row = await ensureProfile(userId);
  return toProfileDto(row);
}

export async function getProfileByUserId(userId: string): Promise<Profile> {
  const row = await db.query.profiles.findFirst({
    where: (p, { eq }) => eq(p.userId, userId),
  });
  if (!row) throw new AppError(404, "not_found", "Profile not found");
  return toProfileDto(row);
}

export async function updateMyProfile(
  userId: string,
  input: UpdateProfileRequest,
): Promise<Profile> {
  await ensureProfile(userId);

  if (input.handle) {
    const clash = await db.query.profiles.findFirst({
      where: (p, { and, eq, ne }) =>
        and(eq(p.handle, input.handle!), ne(p.userId, userId)),
    });
    if (clash) throw new AppError(409, "handle_taken", "That handle is already taken");
  }

  const [row] = await db
    .update(profiles)
    .set({
      ...(input.handle !== undefined ? { handle: input.handle } : {}),
      ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    })
    .where(eq(profiles.userId, userId))
    .returning();

  return toProfileDto(row);
}

export async function followUser(
  followerUserId: string,
  followedUserId: string,
): Promise<{ following: boolean; followerCount: number }> {
  if (followerUserId === followedUserId) {
    throw new AppError(400, "validation_error", "You cannot follow yourself");
  }
  // Target must exist (as a user; profile is optional).
  const target = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, followedUserId),
  });
  if (!target) throw new AppError(404, "not_found", "User not found");

  await db
    .insert(follows)
    .values({ followerUserId, followedUserId })
    .onConflictDoNothing();

  // Notify the followed user.
  const { notify } = await import("./notifications");
  await notify({
    userId: followedUserId,
    type: "follow",
    title: "New follower",
    body: "Someone started following you",
    data: { followerUserId },
  });

  const counts = await followerCounts(followedUserId);
  return { following: true, followerCount: counts.followerCount };
}

export async function unfollowUser(
  followerUserId: string,
  followedUserId: string,
): Promise<{ following: boolean; followerCount: number }> {
  await db
    .delete(follows)
    .where(
      and(
        eq(follows.followerUserId, followerUserId),
        eq(follows.followedUserId, followedUserId),
      ),
    );
  const counts = await followerCounts(followedUserId);
  return { following: false, followerCount: counts.followerCount };
}
