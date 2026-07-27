import type { ICartAgent } from './cart-agent.interface';
import type { AgentRequest, AgentResponse } from '@/types/agent';
import type { ICartService } from '@/services/cart/cart-service.interface';
import type { IOrderService } from '@/services/order/order-service.interface';

/**
 * TODO: implement using the OpenAI SDK + prompts/cart-confirmation.prompt.ts.
 * Must ensure IOrderService.confirmAndPlaceOrder is only invoked after explicit
 * user confirmation has been received.
 */
export class CartAgent implements ICartAgent {
  constructor(
    private readonly cartService: ICartService,
    private readonly orderService: IOrderService,
  ) {}

  async handle(_request: AgentRequest): Promise<AgentResponse> {
    throw new Error('Not implemented');
  }
}
