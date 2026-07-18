/** Redis key helpers for live budget counters. Values are integer micro-dollars. */

export function monthlyKey(workspaceId: string, period: string): string {
  return `budget:${workspaceId}:monthly:${period}`;
}

export function dailyKey(workspaceId: string, day: string): string {
  return `budget:${workspaceId}:daily:${day}`;
}

export function projectMonthlyKey(workspaceId: string, projectId: string, period: string): string {
  return `budget:${workspaceId}:project:${projectId}:monthly:${period}`;
}

export function apiKeyMonthlyKey(workspaceId: string, apiKeyId: string, period: string): string {
  return `budget:${workspaceId}:apikey:${apiKeyId}:monthly:${period}`;
}

export function reservationKey(reservationId: string): string {
  return `budget:rsv:${reservationId}`;
}

export function currentPeriod(date = new Date()): string {
  return date.toISOString().slice(0, 7); // YYYY-MM
}

export function currentDay(date = new Date()): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}
