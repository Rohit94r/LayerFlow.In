import {
  improvePromptResponseSchema,
  type ImprovePromptRequest,
  type ImprovePromptResponse,
} from "@layerflow/contracts";
import { apiFetch } from "@/lib/api/client";

/**
 * One-click prompt improvement — frontend service.
 * POST /api/improve returns the improved prompt with scores, diff and
 * token savings; used by the chat composer's Improve button.
 */
export const improveService = {
  improve: async (body: ImprovePromptRequest): Promise<ImprovePromptResponse> =>
    apiFetch<ImprovePromptResponse>(
      "/api/improve",
      { method: "POST", body },
      improvePromptResponseSchema,
    ),
};
