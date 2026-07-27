import type { AgentRequest, AgentResponse } from '@/types/agent';

/**
 * TODO: define contract for the agent responsible for cart building and order confirmation.
 */
export interface ICartAgent {
  handle(request: AgentRequest): Promise<AgentResponse>;
}
