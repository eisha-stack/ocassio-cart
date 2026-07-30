import type OpenAI from 'openai';
import type { IAgentOrchestrator } from './agent-orchestrator.interface';
import type { AgentRequest, AgentResponse } from '@/types/agent';
import type { IOccasionAgent } from '../occasion-agent/occasion-agent.interface';
import type { ICartAgent } from '../cart-agent/cart-agent.interface';
import type { CartSnapshot } from '@/types/cart';
import type { ProductVariant } from '@/types/product';
import { McpClient } from '@/mcp/client/mcp-client';
import { mergeWithCurated } from '@/mcp/instamart/instamart-tools';
import { normalizeCart, normalizeProducts } from '@/mcp/instamart/normalize';
import { fallbackOpenaiClient, openaiClient } from '@/lib/openai/openai-client';
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

const CART_TOOLS = new Set(['get_cart', 'update_cart', 'clear_cart']);

/**
 * Accumulates ground-truth cart/product data seen during a turn, straight from Instamart's own
 * tool results — never from the model's text. Attached to whatever AgentResponse is ultimately
 * returned so the UI can render real prices/quantities instead of trusting LLM prose (the
 * model has been observed misstating a price the tool result didn't contain).
 */
interface TurnContext {
  cart?: CartSnapshot;
  products?: ProductVariant[];
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
      const turnContext: TurnContext = {};

      if (confirmedAction) {
        if (!pending || pending.tool !== confirmedAction.tool) {
          throw new AgentError('No matching pending action to confirm.');
        }

        const result = await mcpClient.callTool({
          tool: pending.tool,
          input: pending.arguments,
        });
        this.updateTurnContext(turnContext, pending.tool, result.data);

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

      return await this.runCompletionLoop(sessionId, openAiTools, mcpClient, turnContext);
    } finally {
      await mcpClient.disconnect();
    }
  }

  /**
   * update_cart REPLACES the entire cart. The system prompt tells the model to include every
   * existing item, but that's proven unreliable in practice — a model asked to "add biscuits
   * and maggi" dropped 5 previously-added items instead of including them. Enforce
   * merge-not-replace in code rather than trusting the model to reconstruct the full cart
   * itself: fetch the real current cart and merge the model's requested items into it (upsert
   * by spinId, quantity 0 removes) before the real Instamart call goes out. This mirrors what
   * CartService.setItemQuantity already does for the UI's deterministic quick-action buttons.
   */
  private async resolveToolInput(
    mcpClient: McpClient,
    toolName: string,
    requestedArgs: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if (toolName !== 'update_cart') return requestedArgs;

    const requestedItems = Array.isArray(requestedArgs.items)
      ? (requestedArgs.items as { spinId?: unknown; quantity?: unknown }[])
      : [];

    const currentCartResult = await mcpClient.callTool({ tool: 'get_cart', input: {} });
    const currentCart = normalizeCart(currentCartResult.data);

    const merged = new Map<string, number>();
    for (const item of currentCart?.items ?? []) {
      merged.set(item.spinId, item.quantity);
    }
    for (const item of requestedItems) {
      const spinId = typeof item.spinId === 'string' ? item.spinId : undefined;
      const quantity = typeof item.quantity === 'number' ? item.quantity : undefined;
      if (!spinId || quantity === undefined) continue;
      if (quantity > 0) merged.set(spinId, quantity);
      else merged.delete(spinId);
    }

    return {
      selectedAddressId: requestedArgs.selectedAddressId ?? currentCart?.addressId,
      items: Array.from(merged, ([spinId, quantity]) => ({ spinId, quantity })),
    };
  }

  private updateTurnContext(context: TurnContext, toolName: string, resultData: unknown): void {
    if (CART_TOOLS.has(toolName)) {
      const cart = normalizeCart(resultData);
      if (cart) context.cart = cart;
    }

    if (toolName === 'search_products') {
      const products = normalizeProducts(resultData);
      if (products.length > 0) context.products = products;
    }
  }

  /**
   * Tries the primary provider first; on any failure (auth error, exhausted quota, rate
   * limit, or the "no choices" case handled below) retries once against the fallback provider
   * if OPENAI_FALLBACK_API_KEY is configured. Free-tier providers in particular have proven
   * unreliable turn to turn (413s, overloaded/no-choices responses), so this keeps a chat
   * session working through a single provider outage instead of failing the whole turn.
   */
  private async createCompletion(
    messages: ChatMessage[],
    tools: ReturnType<typeof toOpenAiTools>,
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    try {
      const completion = await openaiClient.chat.completions.create({
        model: appConfig.openai.model,
        messages,
        tools,
        tool_choice: 'auto',
      });

      if (!completion.choices?.[0]) {
        throw new AgentError('Primary provider returned no choices', completion);
      }

      return completion;
    } catch (error) {
      if (!fallbackOpenaiClient || !appConfig.openai.fallback) {
        throw error;
      }

      logger.warn('Primary model provider failed — retrying with fallback provider', {
        error: error instanceof Error ? error.message : error,
        fallbackModel: appConfig.openai.fallback.model,
      });

      return fallbackOpenaiClient.chat.completions.create({
        model: appConfig.openai.fallback.model,
        messages,
        tools,
        tool_choice: 'auto',
      });
    }
  }

  private async runCompletionLoop(
    sessionId: string,
    openAiTools: ReturnType<typeof toOpenAiTools>,
    mcpClient: McpClient,
    turnContext: TurnContext,
  ): Promise<AgentResponse> {
    const history = await conversationStore.getHistory(sessionId);
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...this.windowHistory(history),
    ];

    for (let iteration = 0; iteration < MAX_TOOL_CALL_ITERATIONS; iteration += 1) {
      const completion = await this.createCompletion(messages, openAiTools);

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
        if (!assistantMessage.content) {
          // Reasoning models (e.g. gpt-oss) sometimes put their real answer in a separate
          // "reasoning" field and leave content empty, especially when they run low on output
          // tokens. Log every field on the message (not just .content) to check for that.
          logger.warn('[diagnostic] final completion had empty content', {
            finishReason: choice.finish_reason,
            assistantMessage,
          });
        }
        return {
          message: assistantMessage.content ?? '',
          cart: turnContext.cart,
          products: turnContext.products,
        };
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
              input: await this.resolveToolInput(
                mcpClient,
                toolCall.function.name,
                JSON.parse(toolCall.function.arguments || '{}') as Record<string, unknown>,
              ),
            });

        if (!isExtraGatedCall) {
          this.updateTurnContext(
            turnContext,
            toolCall.function.name,
            (resultContent as { data?: unknown }).data,
          );
        }

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
          cart: turnContext.cart,
          products: turnContext.products,
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
      cart: turnContext.cart,
      products: turnContext.products,
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
