---
title: AsyncAPI & codegen
head:
    - - meta
      - name: description
        content: Every ws-asyncapi channel emits a standard AsyncAPI 3.0 document. Serve it, render the UI, and generate a typed client from it with @ws-asyncapi/cli — for separate repos, polyglot stacks, or a published contract.
---

# AsyncAPI & codegen

Every channel produces a standard **AsyncAPI 3.0** document, and `@ws-asyncapi/cli`
generates a typed client from it. Use this path when client and server live in
**separate repos**, when the consumer isn't TypeScript, or when you want a published,
language-agnostic contract. Otherwise prefer the codegen-free
[`createClient<typeof channel>`](/guides/channels-contract#inference-recommended).

## Emit the document

```ts
import { getAsyncApiDocument, getAsyncApiUI } from "ws-asyncapi";
import { chat } from "./server";

const doc = getAsyncApiDocument([chat]); // serve at e.g. GET /asyncapi.json
const html = getAsyncApiUI([chat]);      // interactive docs page → GET /docs
```

The document covers the full surface — events, commands, RPC (with typed errors),
server-RPC, streams, auth credentials, and presence state — plus a per-channel
**contract hash** for drift detection.

## Generate a client

Point the CLI at a running server's document:

```bash
bunx @ws-asyncapi/cli http://localhost:3000/asyncapi.json
# writes generated.ts — a `declare module "@ws-asyncapi/client"` augmentation
```

Import the generated file once (its types augment the client), then use the
address-based factory:

```ts
import "./generated"; // registers the channel types
import { websocketAsyncAPI } from "@ws-asyncapi/client";

const client = websocketAsyncAPI("ws://localhost:3000", "/chat/general");
// same typed surface as createClient: onEvent, request, safeRequest, stream,
// authenticate, presence, history
```

## Which path?

| | `createClient<typeof channel>` | CLI codegen + `websocketAsyncAPI` |
| --- | --- | --- |
| Setup | none (import the type) | run the CLI, import `generated.ts` |
| Best for | monorepo / shared types | separate repos, polyglot, published contract |
| Output in repo | nothing generated | `generated.ts` |

Both produce the same precisely-typed client at runtime and type level.

## Next

- [**Channels & the contract**](/guides/channels-contract)
- [**Adapters**](/guides/adapters) — serving the document & UI
- [**AI agents & LLMs**](/guides/ai-agents) — the AsyncAPI doc as machine-readable contract
