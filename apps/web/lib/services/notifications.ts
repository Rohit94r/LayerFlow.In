import {
  listNotificationsResponseSchema,
  markNotificationsReadResponseSchema,
  unreadNotificationsResponseSchema,
  type ListNotificationsResponse,
  type MarkNotificationsReadResponse,
  type UnreadNotificationsResponse,
} from "@layerflow/contracts";
import { apiFetch, getServerCookieHeader } from "@/lib/api/client";

/**
 * Workspace notifications — agent run completion/failure surfaced by the
 * worker. The topbar bell polls list + unread count.
 */
export const notificationsService = {
  list: async (params?: { limit?: number; offset?: number }): Promise<ListNotificationsResponse> =>
    apiFetch<ListNotificationsResponse>(
      "/api/notifications",
      { query: params },
      listNotificationsResponseSchema,
    ),

  /** Server-component variant — forwards the session cookie (same-origin API). */
  listServer: async (params?: { limit?: number; offset?: number }): Promise<ListNotificationsResponse> => {
    const headers = await getServerCookieHeader();
    return apiFetch<ListNotificationsResponse>(
      "/api/notifications",
      { query: params, ...(headers.Cookie ? { headers } : {}) },
      listNotificationsResponseSchema,
    );
  },

  markRead: async (ids?: string[]): Promise<MarkNotificationsReadResponse> =>
    apiFetch<MarkNotificationsReadResponse>(
      "/api/notifications/read",
      { method: "PATCH", body: ids && ids.length > 0 ? { ids } : {} },
      markNotificationsReadResponseSchema,
    ),

  unreadCount: async (): Promise<UnreadNotificationsResponse> =>
    apiFetch<UnreadNotificationsResponse>(
      "/api/notifications/unread-count",
      {},
      unreadNotificationsResponseSchema,
    ),

  /** Server-component variant — forwards the session cookie (same-origin API). */
  unreadCountServer: async (): Promise<UnreadNotificationsResponse> => {
    const headers = await getServerCookieHeader();
    return apiFetch<UnreadNotificationsResponse>(
      "/api/notifications/unread-count",
      { ...(headers.Cookie ? { headers } : {}) },
      unreadNotificationsResponseSchema,
    );
  },
};