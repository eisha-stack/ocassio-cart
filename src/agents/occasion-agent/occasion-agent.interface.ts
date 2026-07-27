import type { AgentRequest, AgentResponse } from '@/types/agent';

/**
 * TODO: define contract for the agent responsible for occasion detection and bundle generation.
 */
export interface IOccasionAgent {
  handle(request: AgentRequest): Promise<AgentResponse>;
}
