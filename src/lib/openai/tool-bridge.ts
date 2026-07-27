import type OpenAI from 'openai';
import type { McpToolDefinition } from '@/mcp/types/mcp.types';
import { MAX_TOOL_DESCRIPTION_LENGTH } from '@/config/constants';

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

/**
 * Recursively truncates every `description` string inside a JSON Schema. MCP
 * schemas often carry long, human-oriented descriptions on nested properties;
 * sent verbatim for every tool on every request, these are the main reason a
 * single completion call can blow past small-provider TPM limits (e.g. Groq's
 * free tier) before conversation history is even a factor.
 */
function truncateSchemaDescriptions(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(truncateSchemaDescriptions);
  }

  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node as Record<string, unknown>).map(([key, value]) => [
        key,
        key === 'description' && typeof value === 'string'
          ? truncate(value, MAX_TOOL_DESCRIPTION_LENGTH)
          : truncateSchemaDescriptions(value),
      ]),
    );
  }

  return node;
}

/**
 * MCP's `inputSchema` is already JSON Schema, so it maps directly onto OpenAI's
 * function-calling `parameters` field — no translation needed beyond field names
 * and trimming verbose descriptions (see truncateSchemaDescriptions above).
 */
export function toOpenAiTools(
  tools: McpToolDefinition[],
): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description ? truncate(tool.description, MAX_TOOL_DESCRIPTION_LENGTH) : '',
      parameters: truncateSchemaDescriptions(tool.inputSchema) as Record<string, unknown>,
    },
  }));
}
