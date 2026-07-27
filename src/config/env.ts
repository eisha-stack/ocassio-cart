import { z } from 'zod';

/**
 * Runtime environment variable schema.
 * TODO: extend as new integrations (payments, notifications, analytics, etc.) are added.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  // Override to point the OpenAI SDK at an OpenAI-compatible provider (e.g. Groq:
  // https://api.groq.com/openai/v1). Leave unset to use OpenAI's own API.
  OPENAI_BASE_URL: z.string().url().optional(),

  // Swiggy Instamart MCP uses OAuth 2.1 + PKCE (no static API key) — see
  // https://mcp.swiggy.com/.well-known/oauth-authorization-server
  INSTAMART_MCP_SERVER_URL: z.string().url('INSTAMART_MCP_SERVER_URL must be a valid URL'),
  INSTAMART_MCP_AUTH_URL: z.string().url('INSTAMART_MCP_AUTH_URL must be a valid URL'),
  INSTAMART_MCP_TOKEN_URL: z.string().url('INSTAMART_MCP_TOKEN_URL must be a valid URL'),
  INSTAMART_MCP_REGISTRATION_URL: z
    .string()
    .url('INSTAMART_MCP_REGISTRATION_URL must be a valid URL'),
  INSTAMART_MCP_CLIENT_ID: z.string().min(1, 'INSTAMART_MCP_CLIENT_ID is required'),
  INSTAMART_MCP_REDIRECT_URI: z.string().url('INSTAMART_MCP_REDIRECT_URI must be a valid URL'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  // TODO: call dotenv.config() here for non-Next.js execution contexts (scripts, workers, CLIs).
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables. See console output above.');
  }

  return parsed.data;
}

export const env = loadEnv();
