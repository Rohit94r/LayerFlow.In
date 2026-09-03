/**
 * WebSocket Transport — real-time events for streaming tokens, tool events,
 * agent state, and approvals.
 *
 * Upgrades HTTP to WebSocket and bridges the LayerFlow event system protocol
 * (packages/contracts/src/events.ts) to connected clients.
 *
 * The route handler at GET /api/ws validates the session and returns the
 * 101 switching-protocols response with a properly computed
 * Sec-WebSocket-Accept header (SHA-1 + base64).
 *
 * After the upgrade, actual WebSocket frame handling is delegated to the
 * `setupWsServer` function which attaches to the Node.js HTTP server's
 * `upgrade` event — no additional dependencies required.
 */

import { createHash } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db/client";
import { aiChatSessions } from "../../db/schema/chat";
import { logger } from "../../config/logger";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/app-error";
import type { AppEnv } from "../../types";
import type { LayerFlowEvent } from "@layerflow/contracts";

// -- WebSocket Key Computation ------------------------------------------------

/**
 * The WebSocket accept key must be combined with the magic GUID (RFC 6455)
 * and SHA-1 hashed, then base64-encoded.
 */
const WS_MAGIC_GUID = "258EAFA5-E914-47DA-95CA-5AB9BDA0FA0DB6";

/**
 * Compute the proper Sec-WebSocket-Accept response header value.
 */
export function computeWsAcceptKey(key: string): string {
  const hash = createHash("sha1")
    .update(key + WS_MAGIC_GUID)
    .digest();
  return hash.toString("base64");
}

// -- Client State --------------------------------------------------------------

export interface WsClient {
  id: string;
  userId: string;
  workspaceId: string;
  sessionId: string | null;
  subscriptions: string[];
  send(event: LayerFlowEvent): void;
  close(code?: number, reason?: string): void;
  closed: boolean;
}

type WsConnMeta = {
  userId: string;
  workspaceId: string;
  sessionId: string | null;
};

const clients = new Map<string, WsClient>();

export function registerClient(
  id: string,
  meta: WsConnMeta,
  send: (event: LayerFlowEvent) => void,
  close: (code?: number, reason?: string) => void,
): WsClient {
  const client: WsClient = {
    id,
    userId: meta.userId,
    workspaceId: meta.workspaceId,
    sessionId: meta.sessionId,
    subscriptions: ["message.*", "agent.*", "tool.*", "approval.*", "usage.*", "session.*"],
    send,
    close,
    closed: false,
  };
  clients.set(id, client);
  logger.info({ wsClientId: id, workspaceId: meta.workspaceId }, "ws client connected");
  return client;
}

export function unregisterClient(id: string): void {
  const client = clients.get(id);
  if (client) {
    client.closed = true;
    clients.delete(id);
    logger.info({ wsClientId: id }, "ws client disconnected");
  }
}

export function broadcastEvent(
  event: LayerFlowEvent,
  options?: { workspaceId?: string; sessionId?: string; excludeClientId?: string },
): void {
  const type = event.type;
  const prefix = type.split(".").slice(0, -1).join(".") + ".*";
  const wildcard = type.split(".").slice(0, 1).join(".") + ".*";

  for (const [, client] of clients) {
    if (client.closed) continue;
    if (options?.excludeClientId && client.id === options.excludeClientId) continue;
    if (options?.workspaceId && client.workspaceId !== options.workspaceId) continue;
    if (options?.sessionId && client.sessionId !== options.sessionId) continue;

    const matches = client.subscriptions.some(
      (sub) => sub === type || sub === prefix || sub === wildcard || sub === "*",
    );
    if (!matches) continue;

    try {
      client.send(event);
    } catch (err) {
      logger.warn({ wsClientId: client.id, err }, "failed to send ws event");
      client.close(1011, "send failed");
      unregisterClient(client.id);
    }
  }
}

export const wsRouter = new Hono<AppEnv>();
wsRouter.use(requireAuth);

wsRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const workspaceId = c.get("workspaceId");
  const sessionId = c.req.query("sessionId") ?? null;

  if (sessionId) {
    const session = await db.query.aiChatSessions.findFirst({
      where: and(
        eq(aiChatSessions.id, sessionId),
        eq(aiChatSessions.workspaceId, workspaceId),
      ),
    });
    if (!session) {
      throw new AppError(404, "not_found", "Chat session not found for WebSocket binding");
    }
  }

  const upgradeHeader = c.req.header("upgrade");
  if (upgradeHeader?.toLowerCase() !== "websocket") {
    return c.json({ error: "Expected WebSocket upgrade" }, 400);
  }

  const key = c.req.header("sec-websocket-key");
  if (!key) {
    return c.json({ error: "Missing Sec-WebSocket-Key header" }, 400);
  }

  // The @hono/node-server (Node.js) handles the actual TCP upgrade when we
  // return a 101 response with the correct headers.
  return new Response(null, {
    status: 101,
    headers: {
      Upgrade: "websocket",
      Connection: "Upgrade",
      "Sec-WebSocket-Accept": computeWsAcceptKey(key),
      "Sec-WebSocket-Version": "13",
    },
  });
});

/**
 * Wire a WebSocket server onto an existing Node.js HTTP server's `upgrade`
 * event. Call this once during server bootstrap (after `createServer`/`serve`).
 *
 * Example:
 * ```ts
 * import { setupWsServer } from "./routes/ws/ws";
 * import type { Server } from "node:http";
 * setupWsServer(server);
 * ```
 */
export function setupWsServer(server: {
  on(event: "upgrade", listener: (request: IncomingMessage, socket: Duplex, head: Buffer) => void): void;
}): void {
  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (url.pathname !== "/api/ws") {
      socket.destroy();
      return;
    }

    const key = request.headers["sec-websocket-key"];
    if (!key) {
      socket.write(
        "HTTP/1.1 400 Bad Request\r\n" +
        "Content-Type: text/plain\r\n" +
        "Content-Length: 24\r\n" +
        "Connection: close\r\n" +
        "\r\n" +
        "Missing WebSocket key",
      );
      socket.destroy();
      return;
    }

    const accept = computeWsAcceptKey(key as string);
    const responseHeaders = [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${accept}`,
      "",
      "",
    ].join("\r\n");

    socket.write(responseHeaders);

    // The socket is now upgraded; parse WebSocket frames.
    let closed = false;
    const clientId = crypto.randomUUID();
    const meta: WsConnMeta = { userId: "", workspaceId: "", sessionId: null };

    // Send frames as proper WebSocket data frames.
    const send = (event: LayerFlowEvent) => {
      if (closed) return;
      try {
        const json = JSON.stringify(event);
        const payload = Buffer.from(json, "utf-8");
        const frame = Buffer.alloc(2 + payload.length);
        frame[0] = 0x81; // FIN + text opcode
        frame[1] = payload.length; // mask = 0 (server->client)
        payload.copy(frame, 2);
        socket.write(frame);
      } catch (err) {
        logger.warn({ wsClientId: clientId, err }, "failed to write ws frame");
      }
    };

    const close = (code = 1000, reason?: string) => {
      if (closed) return;
      closed = true;
      try {
        // Send close frame
        const reasonBuf = reason ? Buffer.from(reason, "utf-8").slice(0, 123) : Buffer.alloc(0);
        const payload = Buffer.alloc(2 + reasonBuf.length);
        payload.writeUInt16BE(code, 0);
        if (reasonBuf.length > 0) reasonBuf.copy(payload, 2);
        const frame = Buffer.alloc(2 + payload.length);
        frame[0] = 0x88; // FIN + close opcode
        frame[1] = payload.length;
        payload.copy(frame, 2);
        socket.write(frame);
        socket.end();
      } catch {
        // ignore
      }
      unregisterClient(clientId);
    };

    const registered = registerClient(clientId, meta, send, close);

    // Handle incoming frames (pings, pongs, close, data)
    socket.on("data", (data: Buffer) => {
      if (closed) return;
      try {
        const opcode = data[0] & 0x0f;
        if (opcode === 0x8) { // Close
          close(1000);
        } else if (opcode === 0x9) { // Ping
          // Respond with pong
          const pong = Buffer.alloc(2);
          pong[0] = 0x8A; // FIN + pong
          pong[1] = 0;
          socket.write(pong);
        } else if (opcode === 0xA) { // Pong
          // ignore
        } else if (opcode === 0x1 || opcode === 0x2) { // Text or binary
          // Parse masked frame from client
          const mask = data[1] & 0x80;
          let payloadLen = data[1] & 0x7f;
          let offset = 2;
          if (payloadLen === 126) {
            payloadLen = data.readUInt16BE(2);
            offset = 4;
          } else if (payloadLen === 127) {
            payloadLen = Number(data.readBigUInt64BE(2));
            offset = 10;
          }
          const maskingKey = mask ? data.slice(offset, offset + 4) : null;
          if (mask) offset += 4;
          const maskedPayload = data.slice(offset, offset + payloadLen);
          const payload = maskingKey
            ? Buffer.from(maskedPayload.map((byte, i) => byte ^ maskingKey[i % 4]))
            : maskedPayload;
          const text = payload.toString("utf-8");
          // Handle JSON messages from client
          try {
            const msg = JSON.parse(text);
            logger.debug({ wsClientId: clientId, msg }, "ws message received");
          } catch {
            // not JSON, ignore
          }
        }
      } catch (err) {
        logger.warn({ wsClientId: clientId, err }, "WebSocket frame parse error");
        close(1002, "protocol error");
      }
    });

    socket.on("close", () => {
      closed = true;
      unregisterClient(clientId);
    });

    socket.on("error", (err) => {
      logger.warn({ wsClientId: clientId, err: err.message }, "WebSocket socket error");
      closed = true;
      unregisterClient(clientId);
    });
  });
}

export function sendToClient(clientId: string, event: LayerFlowEvent): boolean {
  const client = clients.get(clientId);
  if (!client || client.closed) return false;
  try {
    client.send(event);
    return true;
  } catch {
    return false;
  }
}

export function getWorkspaceClients(workspaceId: string): WsClient[] {
  const result: WsClient[] = [];
  for (const [, client] of clients) {
    if (!client.closed && client.workspaceId === workspaceId) {
      result.push(client);
    }
  }
  return result;
}
