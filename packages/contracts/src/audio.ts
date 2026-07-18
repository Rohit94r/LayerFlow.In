import { z } from "zod";

/** Max characters per speech synthesis request (also bounds cost). */
export const MAX_SPEECH_TEXT_LENGTH = 2_000;

/** POST /api/audio/speech — text-to-speech via the platform ElevenLabs key. */
export const speechRequestSchema = z.object({
  text: z.string().min(1).max(MAX_SPEECH_TEXT_LENGTH),
  /** ElevenLabs voice ID; server default (ELEVENLABS_VOICE_ID) when omitted. */
  voiceId: z.string().min(1).max(100).optional(),
  /** ElevenLabs model ID; server default (ELEVENLABS_MODEL_ID) when omitted. */
  modelId: z.string().min(1).max(100).optional(),
});

export type SpeechRequest = z.infer<typeof speechRequestSchema>;

/** GET /api/audio/status — whether audio features are enabled on this deployment. */
export const audioStatusResponseSchema = z.object({
  enabled: z.boolean(),
});

export type AudioStatusResponse = z.infer<typeof audioStatusResponseSchema>;
