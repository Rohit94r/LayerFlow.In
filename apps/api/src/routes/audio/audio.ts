import { Hono } from "hono";
import { speechRequestSchema, type AudioStatusResponse } from "@layerflow/contracts";
import { releaseBudget, reserveBudget, settleBudget } from "../../budgets/enforce";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/app-error";
import { rateLimit } from "../../middleware/rate-limit";
import {
  estimateSpeechCostMicro,
  isAudioEnabled,
  synthesizeSpeech,
} from "../../services/audio/elevenlabs";
import type { AppEnv } from "../../types";

/**
 * Audio endpoints (optional feature — requires platform ELEVENLABS_API_KEY).
 * Session-authenticated, rate-limited, and budget-enforced like model runs:
 * synthesis cost is reserved before the provider call and settled after.
 */
export const audioRouter = new Hono<AppEnv>();

audioRouter.use(requireAuth);

// GET /api/audio/status — lets the UI show/hide audio features.
audioRouter.get("/status", (c) => {
  const response: AudioStatusResponse = { enabled: isAudioEnabled() };
  return c.json(response);
});

// POST /api/audio/speech — text-to-speech, returns audio/mpeg bytes.
audioRouter.post("/speech", rateLimit({ requestsPerMinute: 10 }), async (c) => {
  const workspaceId = c.get("workspaceId");
  const requestId = c.get("requestId");
  const body = speechRequestSchema.parse(await c.req.json());

  if (!isAudioEnabled()) {
    throw new AppError(503, "audio_disabled", "Audio features are not enabled on this deployment");
  }

  const estimateMicro = estimateSpeechCostMicro(body.text);
  const reservation = await reserveBudget({ workspaceId, estimateMicro });

  try {
    const result = await synthesizeSpeech({
      text: body.text,
      voiceId: body.voiceId,
      modelId: body.modelId,
    });

    // Character-based pricing is known up front, so settle at the estimate.
    await settleBudget({
      reservationId: reservation.reservationId,
      actualMicro: estimateMicro,
      provider: "elevenlabs",
      model: "text-to-speech",
      source: "audio",
    });

    return new Response(result.body, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "no-store",
        "x-request-id": requestId,
      },
    });
  } catch (err) {
    await releaseBudget({ reservationId: reservation.reservationId });
    throw err;
  }
});
