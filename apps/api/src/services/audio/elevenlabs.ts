import { getEnv } from "../../config/env";
import { AppError } from "../../middleware/error";

/**
 * Optional ElevenLabs text-to-speech service.
 *
 * Uses the PLATFORM key from the environment only — the key never reaches
 * clients and is never stored in the database. When ELEVENLABS_API_KEY is
 * unset the feature is disabled and the route returns 503 `audio_disabled`.
 */

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // "Rachel" — ElevenLabs default catalog voice
const DEFAULT_MODEL_ID = "eleven_turbo_v2_5";

/**
 * Flat cost estimate per character in micro-dollars, used for budget
 * reservation. ElevenLabs creator-tier pricing is ≈ $0.15 / 1k chars.
 */
export const SPEECH_COST_MICRO_PER_CHAR = 150;

let fetchImpl: typeof fetch = (...args) => globalThis.fetch(...args);

/** Test seam: swap the HTTP transport. */
export function setElevenLabsFetch(fn: typeof fetch): void {
  fetchImpl = fn;
}

export function resetElevenLabsFetch(): void {
  fetchImpl = (...args) => globalThis.fetch(...args);
}

export function isAudioEnabled(): boolean {
  return Boolean(getEnv().ELEVENLABS_API_KEY);
}

export function estimateSpeechCostMicro(text: string): number {
  return Math.max(1, text.length * SPEECH_COST_MICRO_PER_CHAR);
}

export interface SynthesizeSpeechInput {
  text: string;
  voiceId?: string;
  modelId?: string;
}

export interface SynthesizeSpeechResult {
  /** MP3 bytes stream from ElevenLabs, ready to pipe to the client. */
  body: ReadableStream<Uint8Array>;
  contentType: string;
  characterCount: number;
}

export async function synthesizeSpeech(
  input: SynthesizeSpeechInput,
): Promise<SynthesizeSpeechResult> {
  const env = getEnv();
  if (!env.ELEVENLABS_API_KEY) {
    throw new AppError(503, "audio_disabled", "Audio features are not enabled on this deployment");
  }

  const voiceId = input.voiceId ?? env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;
  const modelId = input.modelId ?? env.ELEVENLABS_MODEL_ID ?? DEFAULT_MODEL_ID;

  let res: Response;
  try {
    res = await fetchImpl(`${ELEVENLABS_BASE_URL}/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: "POST",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text: input.text, model_id: modelId }),
    });
  } catch (err) {
    throw new AppError(
      502,
      "provider_unreachable",
      `elevenlabs request failed: ${err instanceof Error ? err.message : "network error"}`,
    );
  }

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new AppError(
      res.status === 401 || res.status === 403 ? 502 : 502,
      "provider_error",
      `elevenlabs returned ${res.status}: ${detail.slice(0, 300)}`,
    );
  }

  return {
    body: res.body,
    contentType: res.headers.get("Content-Type") ?? "audio/mpeg",
    characterCount: input.text.length,
  };
}
