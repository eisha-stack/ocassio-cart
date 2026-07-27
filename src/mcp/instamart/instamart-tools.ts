import type { McpToolDefinition } from '@/mcp/types/mcp.types';

/**
 * Curated tool descriptions/schemas for the Instamart tools documented at
 * https://mcp.swiggy.com/builders/docs/reference/instamart/ (names, required/optional fields,
 * types) — concise and known-correct field names (e.g. "spinId", never a hallucinated "skuId"),
 * for use as an *overlay* on top of live discovery, not a replacement for it.
 *
 * IMPORTANT: the live server's actual tool list does not exactly match these docs — diffing
 * mcpClient.listTools() against this catalog found 4 real, undocumented tools
 * (get_delivery_status, get_payment_options, check_payment_status, confirm_order — the last of
 * which finalizes real orders and must stay in GATED_MCP_TOOLS) and 3 documented tools that
 * don't actually exist on this account (create_address, delete_address, get_order_details).
 * So mergeWithCurated() below always uses the *live* tool list to decide what exists, and only
 * substitutes a curated description/schema for tools recognized by name — it never adds a tool
 * the live server didn't report, and never hides one it did.
 *
 * TODO: no automated drift check against the docs — if Swiggy changes a known tool, update here.
 */
export const INSTAMART_TOOLS: McpToolDefinition[] = [
  // --- Discover ---
  {
    name: 'get_addresses',
    description:
      "Get all saved delivery addresses for the authenticated user (no coordinates, for privacy), sorted by last order date.",
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'create_address',
    description:
      'Create a new delivery address. Pass the full address text as fullAddress and let this tool parse the components — never ask the user for addressLine/addressLine2/city/postalCode separately.',
    inputSchema: {
      type: 'object',
      properties: {
        fullAddress: { type: 'string', description: 'Full address text to parse.' },
        addressLine: { type: 'string' },
        addressLine2: { type: 'string' },
        locality: { type: 'string' },
        city: { type: 'string' },
        postalCode: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        addressCategory: {
          type: 'string',
          enum: ['HOME', 'WORK', 'OFFICE', 'FRIENDS_AND_FAMILY', 'OTHER'],
        },
        addressTag: { type: 'string' },
        userName: { type: 'string' },
        userPhone: { type: 'string' },
        receiverName: { type: 'string', description: 'Only if delivering to someone else.' },
        receiverPhone: { type: 'string', description: 'Only if delivering to someone else.' },
      },
      required: [
        'fullAddress',
        'addressLine',
        'addressLine2',
        'city',
        'postalCode',
        'latitude',
        'longitude',
        'addressCategory',
        'userName',
        'userPhone',
      ],
    },
  },
  {
    name: 'delete_address',
    description: 'Permanently delete a saved delivery address.',
    inputSchema: {
      type: 'object',
      properties: { addressId: { type: 'string', description: 'From get_addresses.' } },
      required: ['addressId'],
    },
  },
  {
    name: 'search_products',
    description:
      'Search for products available at a delivery address. Returns products with variants (each with a spinId) — never invent a product, price, or spinId this tool did not return.',
    inputSchema: {
      type: 'object',
      properties: {
        addressId: { type: 'string', description: 'From get_addresses.' },
        query: { type: 'string', description: 'Product name, category, or brand.' },
        offset: { type: 'number', description: 'Pagination offset. Default 0.' },
      },
      required: ['addressId', 'query'],
    },
  },
  {
    name: 'your_go_to_items',
    description: "Fetch the user's frequently or recently ordered items for a delivery address.",
    inputSchema: {
      type: 'object',
      properties: {
        addressId: { type: 'string', description: 'From get_addresses.' },
        offset: { type: 'number', description: 'Pagination offset. Default 0.' },
      },
      required: ['addressId'],
    },
  },
  // --- Cart ---
  {
    name: 'clear_cart',
    description: 'Remove all items from the Instamart cart.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_cart',
    description:
      'Get the current cart: items, bill breakdown, and availablePaymentMethods. Call after update_cart to confirm the real total before reporting it to the user.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'update_cart',
    description:
      'Replace the entire cart with the given items (include every item you want kept, not just new ones). Use only real spinId values returned by search_products or your_go_to_items — there is no "skuId" field.',
    inputSchema: {
      type: 'object',
      properties: {
        selectedAddressId: { type: 'string', description: 'From get_addresses.' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              spinId: {
                type: 'string',
                description: 'From search_products/your_go_to_items — never invented.',
              },
              quantity: { type: 'number' },
            },
            required: ['spinId', 'quantity'],
          },
        },
      },
      required: ['selectedAddressId', 'items'],
    },
  },
  // --- Order ---
  {
    name: 'checkout',
    description:
      'Place and confirm the order (creates and pays in one step) — a real order on a real account. Always confirm the cart via get_cart and get explicit user confirmation first.',
    inputSchema: {
      type: 'object',
      properties: {
        addressId: { type: 'string', description: 'From get_addresses — must be user-confirmed.' },
        paymentMethod: {
          type: 'string',
          description: 'From get_cart availablePaymentMethods. Omit to auto-default.',
        },
      },
      required: ['addressId'],
    },
  },
  // --- Track ---
  {
    name: 'get_order_details',
    description: 'Get detailed information for a specific past or active order.',
    inputSchema: {
      type: 'object',
      properties: { orderId: { type: 'string', description: 'From get_orders.' } },
      required: ['orderId'],
    },
  },
  {
    name: 'get_orders',
    description: 'Fetch order history, past orders, or order preferences.',
    inputSchema: {
      type: 'object',
      properties: {
        count: { type: 'number', description: 'Default 10, max recommended 20.' },
        orderType: { type: 'string', description: "e.g. 'DASH', 'INSTAMART'. Default 'DASH'." },
        activeOnly: {
          type: 'boolean',
          description: 'true = only active/ongoing orders. Default false.',
        },
      },
      required: [],
    },
  },
  {
    name: 'track_order',
    description:
      'Track an Instamart order in real time: status, ETA, delivery partner location, payment details.',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'From get_orders.' },
        lat: { type: 'number', description: 'Delivery address latitude.' },
        lng: { type: 'number', description: 'Delivery address longitude.' },
      },
      required: ['orderId', 'lat', 'lng'],
    },
  },
  // --- Support ---
  {
    name: 'report_error',
    description: 'Report a tool or flow error to the Swiggy MCP team.',
    inputSchema: {
      type: 'object',
      properties: {
        tool: { type: 'string', description: 'Name of the tool that errored.' },
        domain: { type: 'string', description: "MCP server, e.g. 'im', 'food', 'dineout'." },
        errorMessage: { type: 'string' },
        flowDescription: { type: 'string' },
        toolContext: {
          type: 'object',
          description: 'Relevant identifiers, e.g. orderId, addressId, spinId, query, cartId.',
        },
        userNotes: { type: 'string' },
      },
      required: ['tool', 'errorMessage'],
    },
  },
];

/**
 * Live tool list stays authoritative for *existence*; a curated entry (if one matches by
 * name) only replaces the description/schema shown to the model, for a shorter and
 * known-correct-field-name version of tools we recognize. Tools the live server reports
 * that aren't in the curated catalog (e.g. get_delivery_status, confirm_order) pass through
 * unchanged, so the model still has access to them.
 */
export function mergeWithCurated(liveTools: McpToolDefinition[]): McpToolDefinition[] {
  const curatedByName = new Map(INSTAMART_TOOLS.map((tool) => [tool.name, tool]));
  return liveTools.map((tool) => curatedByName.get(tool.name) ?? tool);
}
