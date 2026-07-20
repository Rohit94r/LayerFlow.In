import { desc, eq, gte, gt, sql } from "drizzle-orm";
import type { AdminAnalyticsResponse } from "@layerflow/contracts";
import { db } from "../../db/client";
import { sessions, users } from "../../db/schema";

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfUtcWeek(d = new Date()): Date {
  const day = startOfUtcDay(d);
  // Monday-based week in UTC (ISO-ish)
  const weekday = day.getUTCDay(); // 0=Sun
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  day.setUTCDate(day.getUTCDate() - daysFromMonday);
  return day;
}

/** Platform-wide auth analytics for the admin dashboard. Never returns session tokens. */
export async function getAdminAnalytics(): Promise<AdminAnalyticsResponse> {
  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const weekStart = startOfUtcWeek(now);

  const [[totalRow], [todayRow], [weekRow], [activeRow], userRows, loginRows] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(users),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(gte(users.createdAt, todayStart)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(gte(users.createdAt, weekStart)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(sessions)
        .where(gt(sessions.expiresAt, now)),
      db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt,
          lastLoginAt: sql<Date | null>`(
            select max(${sessions.createdAt})
            from ${sessions}
            where ${sessions.userId} = ${users.id}
          )`,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(200),
      db
        .select({
          id: sessions.id,
          userId: sessions.userId,
          email: users.email,
          name: users.name,
          createdAt: sessions.createdAt,
          expiresAt: sessions.expiresAt,
          ipAddress: sessions.ipAddress,
          userAgent: sessions.userAgent,
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .orderBy(desc(sessions.createdAt))
        .limit(50),
    ]);

  return {
    totals: {
      users: totalRow?.count ?? 0,
      activeSessions: activeRow?.count ?? 0,
      usersToday: todayRow?.count ?? 0,
      usersThisWeek: weekRow?.count ?? 0,
    },
    users: userRows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
    })),
    recentLogins: loginRows.map((s) => ({
      id: s.id,
      userId: s.userId,
      email: s.email,
      name: s.name,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
    })),
    generatedAt: now.toISOString(),
  };
}
