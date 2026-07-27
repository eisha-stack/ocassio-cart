/**
 * Minimal manual dependency-injection composition root.
 *
 * Every service/agent/adapter is constructed here and wired together via constructor
 * injection against interfaces (not concretions), keeping the rest of the codebase
 * free of `new` calls and easy to unit test with fakes/mocks.
 *
 * TODO: swap placeholder implementations for real ones as each layer is built out.
 * Kept intentionally framework-free (no DI library) to preserve explicit, typed wiring.
 */

import { McpClient } from '@/mcp/client/mcp-client';
import { InstamartAdapter } from '@/mcp/instamart/instamart-adapter';
import { BundleService } from '@/services/bundle/bundle-service';
import { CartService } from '@/services/cart/cart-service';
import { OrderService } from '@/services/order/order-service';
import { OccasionAgent } from '@/agents/occasion-agent/occasion-agent';
import { CartAgent } from '@/agents/cart-agent/cart-agent';
import { AgentOrchestrator } from '@/agents/orchestrator/agent-orchestrator';

function createContainer() {
  const mcpClient = new McpClient();
  const instamartAdapter = new InstamartAdapter(mcpClient);

  const bundleService = new BundleService();
  const cartService = new CartService(instamartAdapter);
  const orderService = new OrderService(instamartAdapter);

  const occasionAgent = new OccasionAgent(bundleService);
  const cartAgent = new CartAgent(cartService, orderService);

  const agentOrchestrator = new AgentOrchestrator(occasionAgent, cartAgent);

  return {
    mcpClient,
    instamartAdapter,
    bundleService,
    cartService,
    orderService,
    occasionAgent,
    cartAgent,
    agentOrchestrator,
  };
}

export const container = createContainer();
export type Container = ReturnType<typeof createContainer>;
