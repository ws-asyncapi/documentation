---
name: codegen
description: The AsyncAPI 3.0 document and the CLI-generated typed client (websocketAsyncAPI) — when to use codegen instead of createClient, and how to wire it up.
---

# AsyncAPI document & CLI codegen

Every channel produces a standard **AsyncAPI 3.0** document, and the CLI generates
a typed client from it. Use this path when client and server live in **separate
repos** or you want a published, language-agnostic contract. Otherwise prefer the
codegen-free [`createClient<typeof channel>`](client.md).

## Emit the document

```ts
import { getAsyncApiDocument } from "ws-asyncapi";
import { chat } from "./server";

const doc = getAsyncApiDocument([chat]); // serve at e.g. GET /asyncapi.json
```

The document covers the full surface — events, commands, rpc (with typed errors),
server-rpc, streams, auth credentials, and presence state — plus a per-channel
contract hash for drift detection.

## Generate a client

```bash
bunx @ws-asyncapi/cli http://localhost:3000/asyncapi.json
# writes generated.ts (a `declare module "@ws-asyncapi/client"` augmentation)
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
