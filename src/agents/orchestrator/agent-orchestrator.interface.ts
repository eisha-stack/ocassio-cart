import type { AgentRequest, AgentResponse } from '@/types/agent';

/**
 * Top-level orchestration contract that routes a user message to the
 * appropriate specialized agent (occasion, cart, etc.).
 * TODO: refine routing semantics once the conversation flow is designed.
 */
export interface IAgentOrchestrator {
  handleMessage(request: AgentRequest): Promise<AgentResponse>;
}
