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
