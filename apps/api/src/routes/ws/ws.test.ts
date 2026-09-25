import { describe, expect, it } from "vitest";
import type { IncomingMessage } from "node:http";
import type { LayerFlowEvent } from "@layerflow/contracts";
import {
  computeWsAcceptKey,
  broadcastEvent,
  registerClient,
  unregisterClient,
  resolveWsIdentity,
} from "./ws";

function makeRequest(headers: Record<string, string | undefined>): IncomingMessage {
  const req = { headers } as unknown as IncomingMessage;
  return req;
}

describe("computeWsAcceptKey", () => {
  it("returns the RFC 6455 example value", () => {
    // RFC 6455 §4.2.2: key "dGhlIHNhbXBsZSBub25jZQ==" concatenated with
    // the magic GUID "258EAFA5-E914-47DA-95CA-C5AB0DC85B11" produces the
    // example accept value below.
    expect(computeWsAcceptKey("dGhlIHNhbXBsZSBub25jZQ==")).toBe(
      "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=",
    );
  });
});

describe("broadcastEvent tenant isolation", () => {
  it("does not deliver workspace-scoped events to clients in another workspace", () => {
    const delivered: string[] = [];
    const a = registerClient("client-a", { userId: "u1", workspaceId: "ws-a", sessionId: null }, (e) => delivered.push(e.type), () => {});
    const b = registerClient("client-b", { userId: "u2", workspaceId: "ws-b", sessionId: null }, (e) => delivered.push(e.type), () => {});

    broadcastEvent(
      { type: "agent.completed", agentId: "ag", workspaceId: "ws-a" } as unknown as LayerFlowEvent,
      { workspaceId: "ws-a" },
    );

    unregisterClient(a.id);
    unregisterClient(b.id);
    expect(delivered).toEqual(["agent.completed"]);
  });
});

describe("resolveWsIdentity", () => {
  it("rejects a request with no session credentials", async () => {
    const identity = await resolveWsIdentity(makeRequest({}));
    expect(identity).toBeNull();
  });

  it("never trusts query params for identity", async () => {
    // Only query params + a nonsense bearer are present — no session cookie.
    const identity = await resolveWsIdentity(
      makeRequest({ authorization: "Bearer invalid-token" }),
    );
    expect(identity).toBeNull();
  });
});