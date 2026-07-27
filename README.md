# OccasioCart

An AI-powered shopping agent that generates grocery bundles for different occasions and uses
the **Swiggy Instamart MCP** server to search products, build carts, and place orders — always
after explicit user confirmation.

> **Status:** architecture scaffold only. No business logic, MCP integration, or AI prompt
> content has been implemented yet — every module is a typed placeholder with `TODO`s.

## Tech stack

- Next.js 15 (App Router, Node.js runtime)
- TypeScript (strict mode)
- Tailwind CSS
- Zod (env validation)
- dotenv
- ESLint (flat config) + Prettier
- OpenAI SDK (placeholder client only)
- Model Context Protocol SDK (placeholder client only)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in values — see below
npm run dev
```

Other scripts: `npm run build`, `npm run lint`, `npm run format`, `npm run typecheck`.

### Environment variables

Validated at startup by `src/config/env.ts` via Zod. See `.env.example` for the full list
(`OPENAI_API_KEY`, `INSTAMART_MCP_SERVER_URL`, `INSTAMART_MCP_API_KEY`). Missing/invalid vars
throw immediately on import — this is intentional fail-fast behavior for a production app.

## Architecture

The codebase is organized into layers with a strict, one-directional dependency rule: each
layer only knows about the layers _below_ it, and only through interfaces.

```
app (routes)
  -> agents (AI orchestration)
       -> services (business logic)
            -> mcp (Swiggy Instamart communication)
  -> components (UI)
shared, depended on by everything: types, utils, config
lib: infra (SDK clients) + the DI composition root
```

### Folder responsibilities

| Folder            | Responsibility                                                                                                                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/`        | Next.js App Router: pages, layouts, and API route handlers only. No business logic — routes parse the request and delegate to the DI container.                                                     |
| `src/components/` | Presentational/UI React components. Framework-bound, no direct service/MCP calls.                                                                                                                   |
| `src/agents/`     | AI orchestration layer. Decides _what to do_ with a user message by coordinating `services/` and `prompts/`. Never talks to MCP directly.                                                           |
| `src/services/`   | Business logic layer (bundle generation, cart management, order placement). Depends on `mcp/` only through interfaces (`IInstamartAdapter`), never the concrete MCP client.                         |
| `src/mcp/`        | All Swiggy Instamart MCP communication. `mcp/client` wraps the raw Model Context Protocol SDK; `mcp/instamart` exposes a domain-specific adapter (`IInstamartAdapter`) that `services/` depends on. |
| `src/prompts/`    | Prompt templates used by `agents/`. Currently empty placeholders.                                                                                                                                   |
| `src/types/`      | Shared domain types (`Occasion`, `Product`, `Cart`, `Order`, `AgentRequest`/`AgentResponse`) used across all layers.                                                                                |
| `src/utils/`      | Generic, framework-agnostic helpers: logger interface, error hierarchy, `Result` type.                                                                                                              |
| `src/config/`     | Environment variable validation (Zod) and derived app configuration/constants.                                                                                                                      |
| `src/lib/`        | Infrastructure: third-party SDK client instances (OpenAI) and the manual dependency-injection composition root (`container.ts`) that wires every interface to its implementation.                   |

### Design principles applied

- **Dependency Inversion / DI:** every cross-layer dependency is expressed as an interface
  (`I*Service`, `I*Agent`, `IMcpClient`, `IInstamartAdapter`). Concrete classes are only
  instantiated once, in `src/lib/container.ts`, and injected via constructors. Nothing reaches
  for a concrete implementation directly.
- **Single Responsibility:** each service/agent/adapter owns exactly one concern (e.g.
  `OrderService` only places orders; it knows nothing about prompts or chat UI).
- **Interface Segregation:** contracts are narrow and specific to their consumer
  (`ICartService` vs `IOrderService`) rather than one large "god" interface.
- **Open/Closed:** new occasions, agents, or MCP tools can be added by implementing an existing
  interface and registering it in the container, without modifying consumers.

### Absolute imports

`@/*` maps to `src/*` (configured in `tsconfig.json`), e.g. `import { env } from '@/config/env'`.

## What's intentionally NOT implemented yet

- Business logic in any `services/` implementation (all throw `Not implemented`).
- MCP wiring in `mcp/client` and `mcp/instamart` (placeholder classes only).
- Prompt content in `prompts/*.prompt.ts` (empty strings).
- AI orchestration logic in `agents/*` (all throw `Not implemented`).

These will be filled in incrementally, layer by layer, in follow-up work.
