import { env } from './env';

/**
 * Derived, typed application configuration built on top of validated env vars.
 * TODO: expand with feature flags, timeouts, and retry policies as they're needed.
 */
export const appConfig = {
  openai: {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    baseUrl: env.OPENAI_BASE_URL,
    fallback: env.OPENAI_FALLBACK_API_KEY
      ? {
          apiKey: env.OPENAI_FALLBACK_API_KEY,
          baseUrl: env.OPENAI_FALLBACK_BASE_URL,
          model: env.OPENAI_FALLBACK_MODEL ?? env.OPENAI_MODEL,
        }
      : undefined,
  },
  instamart: {
    mcpServerUrl: env.INSTAMART_MCP_SERVER_URL,
    oauth: {
      authUrl: env.INSTAMART_MCP_AUTH_URL,
      tokenUrl: env.INSTAMART_MCP_TOKEN_URL,
      registrationUrl: env.INSTAMART_MCP_REGISTRATION_URL,
      clientId: env.INSTAMART_MCP_CLIENT_ID,
      redirectUri: env.INSTAMART_MCP_REDIRECT_URI,
      scope: 'mcp:tools mcp:resources mcp:prompts',
    },
  },
  isProduction: env.NODE_ENV === 'production',
} as const;
