import type { IOccasionAgent } from './occasion-agent.interface';
import type { AgentRequest, AgentResponse } from '@/types/agent';
import type { IBundleService } from '@/services/bundle/bundle-service.interface';

/**
 * TODO: implement using the OpenAI SDK + prompts/occasion-bundle.prompt.ts + IBundleService.
 */
export class OccasionAgent implements IOccasionAgent {
  constructor(private readonly bundleService: IBundleService) {}

  async handle(_request: AgentRequest): Promise<AgentResponse> {
    throw new Error('Not implemented');
  }
}
