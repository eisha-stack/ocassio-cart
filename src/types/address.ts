/**
 * A saved Instamart delivery address, normalized from get_addresses (see
 * mcp/instamart/normalize.ts — the real response schema isn't publicly documented).
 */
export interface AddressSummary {
  id: string;
  label: string;
  userName?: string;
  isDefault?: boolean;
}
