import type { IAgentOrchestrator } from './agent-orchestrator.interface';
import type { AgentRequest, AgentResponse } from '@/types/agent';
import type { IOccasionAgent } from '../occasion-agent/occasion-agent.interface';
import type { ICartAgent } from '../cart-agent/cart-agent.interface';
import { McpClient } from '@/mcp/client/mcp-client';
import { mergeWithCurated } from '@/mcp/instamart/instamart-tools';
import { openaiClient } from '@/lib/openai/openai-client';
import { toOpenAiTools } from '@/lib/openai/tool-bridge';
import { SYSTEM_PROMPT } from '@/prompts/system.prompt';
import { appConfig } from '@/config/app-config';
import {
  GATED_MCP_TOOLS,
  MAX_HISTORY_TURNS,
  MAX_TOOL_CALL_ITERATIONS,
  MAX_TOOL_RESULT_LENGTH,
} from '@/config/constants';
import { AgentError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { conversationStore, type ChatMessage } from './conversation-store';

function truncatedToolResultJson(result: unknown): string {
  const json = JSON.stringify(result);
  return json.length > MAX_TOOL_RESULT_LENGTH
    ? `${json.slice(0, MAX_TOOL_RESULT_LENGTH)}…(truncated)`
    : json;
}

/**
 * Drives a single chat turn: connects to Instamart MCP for this user, gives the OpenAI
 * model access to every discovered tool, and executes tool calls automatically —
 * except tools in GATED_MCP_TOOLS (checkout), which are surfaced back to the caller as
 * `pendingAction` and only executed once `confirmedAction` is supplied on a later call.
 *
 * TODO: once occasion-detection/cart-building need distinct prompts or behavior, split
 * this loop's responsibilities out to occasionAgent/cartAgent below (currently unused —
 * kept as constructor deps so the DI wiring in lib/container.ts doesn't need to change).
 */
export class AgentOrchestrator implements IAgentOrchestrator {
  constructor(
    private readonly occasionAgent: IOccasionAgent,
    private readonly cartAgent: ICartAgent,
  ) {}

  async handleMessage(request: AgentRequest): Promise<AgentResponse> {
    const { userId: sessionId, message, confirmedAction, instamartAccessToken } = request;

    const mcpClient = new McpClient();
    await mcpClient.connect(instamartAccessToken);

    try {
      // Live discovery decides what tools *exist* (see instamart-tools.ts for why this can't be
      // a static list — the live server's tools don't exactly match the public docs). The
      // curated catalog only overlays a shorter, known-correct-field-name description/schema
      // for tools it recognizes by name.
      const liveTools = await mcpClient.listTools();
      const openAiTools = toOpenAiTools(mergeWithCurated(liveTools));

      const pending = conversationStore.getPendingAction(sessionId);

      if (confirmedAction) {
        if (!pending || pending.tool !== confirmedAction.tool) {
          throw new AgentError('No matching pending action to confirm.');
        }

        const result = await mcpClient.callTool({
          tool: pending.tool,
          input: pending.arguments,
        });

        await conversationStore.appendMessages(sessionId, [
          {
            role: 'tool',
            tool_call_id: pending.toolCallId,
            content: truncatedToolResultJson(result),
          },
        ]);
        conversationStore.clearPendingAction(sessionId);
      } else {
        if (pending) {
          // A previous gated call was never confirmed — resolve its dangling tool_call
          // so the message history stays valid before we add a new user message.
          await conversationStore.appendMessages(sessionId, [
            {
              role: 'tool',
              tool_call_id: pending.toolCallId,
              content: JSON.stringify({ success: false, error: 'Cancelled by user' }),
            },
          ]);
          conversationStore.clearPendingAction(sessionId);
        }

        await conversationStore.appendMessages(sessionId, [{ role: 'user', content: message }]);
      }

      return await this.runCompletionLoop(sessionId, openAiTools, mcpClient);
    } finally {
      await mcpClient.disconnect();
    }
  }

  private async runCompletionLoop(
    sessionId: string,
    openAiTools: ReturnType<typeof toOpenAiTools>,
    mcpClient: McpClient,
  ): Promise<AgentResponse> {
    const history = await conversationStore.getHistory(sessionId);
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...this.windowHistory(history),
    ];

    for (let iteration = 0; iteration < MAX_TOOL_CALL_ITERATIONS; iteration += 1) {
      const completion = await openaiClient.chat.completions.create({
        model: appConfig.openai.model,
        messages,
        tools: openAiTools,
        tool_choice: 'auto',
      });

      // completion.choices can itself be undefined (not just empty) when an OpenAI-compatible
      // provider (e.g. a free OpenRouter model that's overloaded/unavailable) returns a
      // non-standard error body with a 200 status — the SDK doesn't throw in that case, so
      // this must be checked explicitly rather than indexing straight into completion.choices[0].
      const choice = completion.choices?.[0];

      if (!choice) {
        logger.error('Completion response had no choices', { completion });
        throw new AgentError(
          'The model provider returned an unexpected response (no choices) — check server logs for the raw response.',
        );
      }

      const assistantMessage = choice.message;
      messages.push(assistantMessage);
      await conversationStore.appendMessages(sessionId, [assistantMessage]);

      logger.debug('[diagnostic] completion iteration', {
        iteration,
        finishReason: choice.finish_reason,
        toolCallCount: assistantMessage.tool_calls?.length ?? 0,
        toolCalls: assistantMessage.tool_calls?.map((tc) => ({
          name: tc.function.name,
          arguments: tc.function.arguments,
        })),
        contentPreview: assistantMessage.content?.slice(0, 300),
      });

      const toolCalls = assistantMessage.tool_calls ?? [];

      if (toolCalls.length === 0) {
        return { message: assistantMessage.content ?? '' };
      }

      // The model can request several tool calls in one completion. Every one of them needs a
      // matching 'tool' response message before the next completion call, or the message
      // history becomes invalid for good. Gated calls (checkout/confirm_order) are the
      // exception: the first one found becomes the pending action returned to the caller,
      // left deliberately unresolved until the user confirms; any others are resolved as
      // skipped so a second gated call in the same batch can never slip through unconfirmed.
      const gatedCalls = toolCalls.filter((tc) =>
        (GATED_MCP_TOOLS as readonly string[]).includes(tc.function.name),
      );
      const primaryGatedCall = gatedCalls[0];

      for (const toolCall of toolCalls) {
        if (toolCall === primaryGatedCall) continue;

        const isExtraGatedCall = gatedCalls.includes(toolCall);
        const resultContent = isExtraGatedCall
          ? { success: false, error: 'Skipped — only one gated action can be pending at a time.' }
          : await mcpClient.callTool({
              tool: toolCall.function.name,
              input: JSON.parse(toolCall.function.arguments || '{}') as Record<string, unknown>,
            });

        const toolMessage: ChatMessage = {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: truncatedToolResultJson(resultContent),
        };
        messages.push(toolMessage);
        await conversationStore.appendMessages(sessionId, [toolMessage]);
      }

      if (primaryGatedCall) {
        const args = JSON.parse(primaryGatedCall.function.arguments || '{}') as Record<
          string,
          unknown
        >;
        conversationStore.setPendingAction(sessionId, {
          toolCallId: primaryGatedCall.id,
          tool: primaryGatedCall.function.name,
          arguments: args,
        });

        return {
          message: assistantMessage.content || 'Ready to proceed — please confirm to continue.',
          requiresConfirmation: true,
          pendingAction: { tool: primaryGatedCall.function.name, arguments: args },
        };
      }
    }

    // Ran out of iterations without the model producing a final text response. Rather than
    // 500ing the whole request (the tool calls made so far already succeeded and are saved in
    // conversationStore), tell the user in-band — asking them to continue keeps the existing
    // history and lets the model pick up from wherever it left off.
    logger.warn('Exceeded max tool-call iterations without a final response', { sessionId });
    return {
      message:
        "I've made some progress but didn't finish — I'm still working through the details. Could you say \"continue\" so I can pick up where I left off?",
    };
  }

  /**
   * Caps how much stored history gets sent to the model to the last
   * MAX_HISTORY_TURNS user turns. The full history stays in conversationStore
   * (untouched) — this only windows what's sent per request, since unbounded
   * history is the other main driver (besides tool schemas) of requests
   * outgrowing small-provider TPM limits over a long conversation. Always cuts
   * at a user-message boundary so an assistant tool_call is never separated
   * from its paired tool response.
   */
  private windowHistory(history: ChatMessage[]): ChatMessage[] {
    const turnStarts = history.reduce<number[]>((starts, message, index) => {
      if (message.role === 'user') starts.push(index);
      return starts;
    }, []);

    if (turnStarts.length <= MAX_HISTORY_TURNS) {
      return history;
    }

    const windowStart = turnStarts[turnStarts.length - MAX_HISTORY_TURNS]!;
    return history.slice(windowStart);
  }
}
