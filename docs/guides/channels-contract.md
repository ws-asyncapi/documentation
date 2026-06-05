---
title: Channels & the contract
head:
    - - meta
      - name: description
        content: The Channel builder is the single source of truth in ws-asyncapi — events, commands, RPC, streams, presence, history, auth, path params, and the AsyncAPI/codegen path.
---

# Channels & the contract

A **`Channel`** is the contract between server and client. It's a chainable
builder; each method adds a typed capability and returns a new, widened channel
type. The same value drives server-side validation, the client's inferred types,
and an emitted AsyncAPI 3.0 document.

Each channel is its **own WebSocket route** (path-per-channel — no multiplexing).

```ts
import { Channel } from "ws-asyncapi";
import { z } from "zod";

export const chat = new Channel("/chat/:room", "chat");
//                               ^ path pattern  ^ name
```

## Path parameters

Path params (`:room`) are captured and available to handlers. The client must
connect to a concrete path that matches the pattern.

```ts
const channel = new Channel("/doc/:id", "doc");
// client connects to "/doc/42"
```

## Declaring messages

| Method | Direction | Reply? | On the client |
| --- | --- | --- | --- |
| `.serverMessage(name, schema)` | server → client | — | `client.onEvent(name, cb)` |
| `.clientMessage(name, handler, schema)` | client → server | no | `client.call(name, data)` |
| `.rpc(name, in, out, handler, errors?)` | client → server | yes | `await client.request(name, in)` |
| `.serverRpc(name, in, out)` | server → client | yes | `client.onRequest(name, handler)` |
| `.stream(name, in, out, handler)` | server → client (many) | — | `for await (… of client.stream(name, in))` |

```ts
export const chat = new Channel("/chat/:room", "chat")
    .serverMessage("message", z.object({ from: z.string(), text: z.string() }))
    .clientMessage(
        "typing",
        ({ ws, message }) => ws.publish("room", "typing", message),
        z.object({ on: z.boolean() }),
    )
    .rpc(
        "send",
        z.object({ text: z.string() }),
        z.object({ id: z.string() }),
        async ({ message }) => ({ id: crypto.randomUUID() }),
    );
```

Names must be unique across `serverMessage` / `clientMessage` / `rpc` /
`serverRpc` / `stream` within a channel — the builder rejects collisions when the
AsyncAPI document is generated.

## Validators

Any [Standard Schema](https://standardschema.dev) validator works — zod, valibot,
arktype. The schema's **input** shape validates inbound payloads; its **output**
(parsed) shape is what handlers and the client see, so transforms and defaults
flow through.

## Connection lifecycle & context

```ts
new Channel("/chat/:room", "chat")
    .onOpen(({ ws, request }) => ws.subscribe("room"))
    .onClose(({ ws }) => {/* cleanup */})
    // accumulate typed context (auth, db handles, per-connection state)
    .derive(({ request }) => ({ userId: request.query.token ?? "anon" }))
    .resolve(async ({ userId }) => ({ user: await loadUser(userId) }));
```

`.derive()` / `.resolve()` add fields to the context object every handler
receives (Elysia-style). Use them for auth, dependency injection, and
per-connection state. See [RPC & acknowledgements](/guides/rpc) for how errors in
this pipeline surface to callers.

## Presence, history & auth

These are covered in depth in their own guides, but they're declared on the same
builder:

```ts
new Channel("/doc/:id", "doc")
    // typed per-room presence roster
    .presence(z.object({ name: z.string(), cursor: z.object({ x: z.number(), y: z.number() }).nullable() }))
    // retain the last 50 "message" events per room for rewind/backlog
    .history("message", { keep: 50 })
    // mid-connection credential refresh (token rotation without a reconnect)
    .onAuth(z.object({ token: z.string() }), ({ credentials }) => ({ userId: verify(credentials.token) }));
```

See [Presence & live cursors](/guides/presence-cursors) for the roster and cursor
APIs.

## Two ways to get a typed client

### Inference (recommended)

`createClient<typeof channel>()` infers the entire client surface directly from
the channel value's type. No build step, nothing generated into your repo.

```ts
import { createClient } from "@ws-asyncapi/client";
import type { chat } from "./server";

const client = createClient<typeof chat>("ws://localhost:3000", "/chat/general");
```

### AsyncAPI + CLI codegen

Every channel also produces a standard **AsyncAPI 3.0** document, and the CLI
generates an equivalent typed client from it. Use this when client and server
live in separate repos, or when you want a published, language-agnostic contract.

```ts
import { getAsyncApiDocument } from "ws-asyncapi";

const doc = getAsyncApiDocument([chat]);
// serve `doc` at e.g. GET /asyncapi.json
```

```bash
# generate a typed client from a running server's document
bunx @ws-asyncapi/cli http://localhost:3000/asyncapi.json
```

The generated client is typed for the **full** surface — events, commands, RPC,
server-RPC, streams, auth credentials, presence state, and history — matching the
inference path.

## Next

- [**RPC & acknowledgements**](/guides/rpc)
- [**Presence & live cursors**](/guides/presence-cursors)
- [**React & Solid bindings**](/guides/react-solid)
