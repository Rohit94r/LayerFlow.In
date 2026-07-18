/** Hono context variables available after the middleware chain. */
export type AppEnv = {
  Variables: {
    /** Set by requestId middleware on every request. */
    requestId: string;
    /** Set by requireAuth. Empty string when authenticated via API key only. */
    userId: string;
    /** Active workspace for the session user or API key. */
    workspaceId: string;
    /** Set by requireApiKey for /v1/* traffic. */
    apiKeyId?: string;
    /** Optional project binding from the API key. */
    apiKeyProjectId?: string | null;
  };
};
