import OpenAI from 'openai';
import { appConfig } from '@/config/app-config';

/**
 * Shared OpenAI SDK client instance. baseUrl lets this point at any OpenAI-compatible
 * provider (e.g. Groq) instead of OpenAI itself — see OPENAI_BASE_URL in src/config/env.ts.
 * TODO: configure retries/timeouts once real usage patterns are known.
 */
export const openaiClient = new OpenAI({
  apiKey: appConfig.openai.apiKey,
  baseURL: appConfig.openai.baseUrl,
});

/**
 * Second provider client, only constructed when OPENAI_FALLBACK_API_KEY is set. Used by
 * AgentOrchestrator to retry a completion call on a different provider/model when the primary
 * one errors — see agent-orchestrator.ts's createCompletion().
 */
export const fallbackOpenaiClient = appConfig.openai.fallback
  ? new OpenAI({
      apiKey: appConfig.openai.fallback.apiKey,
      baseURL: appConfig.openai.fallback.baseUrl,
    })
  : undefined;
