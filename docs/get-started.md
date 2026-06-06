---
title: Get started
head:
    - - meta
      - name: description
        content: Stand up a ws-asyncapi server and a fully-typed browser client in a few minutes — define a channel, serve it on Node, and call it from a type-safe client.
---

# Get started

This guide takes you from nothing to a typed, bidirectional WebSocket in a few
minutes. You'll define a **channel** (the contract), serve it on Node, and connect
a client whose types come straight from that channel — no codegen.

## Prerequisites

- Node.js 18+ or [Bun](https://bun.sh)
- A TypeScript project

## 1. Install

You need the core, the Node adapter, the client, and a validator. We'll use
[zod](https://zod.dev) here.

::: pm-add ws-asyncapi @ws-asyncapi/adapter-node @ws-asyncapi/client zod
:::

::: tip
Prefer valibot or arktype? Any [Standard Schema](https://standardschema.dev)
validator works — see [Channels & the contract](/guides/channels-contract#validators).
Stick with zod for this tutorial.
:::

## 2. Define the contract

A `Channel` is a chainable builder. The first argument is the connection path
(each channel is its own WebSocket route); the second is its name.

```ts
// server.ts
import { Channel } from "ws-asyncapi";
import { z } from "zod";

export const chat = new Channel("/chat/:room", "chat")
    // server → client event (fire-and-forget)
    .serverMessage("message", z.object({ from: z.string(), text: z.string() }))
    // client → server RPC: handler returns the typed reply
    .rpc(
        "send",
        z.object({ text: z.string() }),
        z.object({ id: z.string() }),
        async ({ message, ws }) => {
            const id = crypto.randomUUID();
            // broadcast to everyone subscribed to this room
            ws.publish("room", "message", { from: "you", text: message.text });
            return { id };
        },
    )
    // subscribe each new connection to the room topic
    .onOpen(({ ws }) => ws.subscribe("room"));
```

::: tip Export the channel value
Export `chat` so the client can import its **type** with
`import type { chat } from "./server"`. Only the type crosses the boundary — no
server code ends up in your client bundle.
:::

## 3. Serve it

The Node adapter hosts one or more channels and returns a handle you can close.

```ts
// server.ts (continued)
import { createNodeWsServer } from "@ws-asyncapi/adapter-node";

createNodeWsServer([chat], { port: 3000 });
console.log("ws-asyncapi listening on :3000");
```

Run it with [Bun](https://bun.sh) (which runs TypeScript directly):

```bash
bun server.ts
```

You should see `ws-asyncapi listening on :3000`.

## 4. Connect a typed client

`createClient<typeof chat>` infers the whole surface from the contract.

```ts
// client.ts
import { createClient } from "@ws-asyncapi/client";
import type { chat } from "./server";

const client = createClient<typeof chat>(
    "ws://localhost:3000",
    "/chat/general", // must match the channel's path pattern
);

// typed event subscription
client.onEvent("message", (m) => {
    // m: { from: string; text: string }
    console.log(`${m.from}: ${m.text}`);
});

// typed RPC — resolves with { id: string }
const { id } = await client.request("send", { text: "hello!" });
console.log("sent", id);
```

That's it. The client reconnects automatically, heartbeats to detect dead
connections, buffers outgoing calls while offline, and recovers missed events on
reconnect — all on by default.

## What just happened

- The **channel** is the single source of truth. The server validates every
  inbound payload against it; the client's types are inferred from it.
- `serverMessage` declares a **server → client event**; `rpc` declares a
  **client → server call with a typed reply**. (`clientMessage` declares a
  fire-and-forget **command** — no reply.)
- `ws.publish(topic, event, data)` fans an event out to everyone subscribed to a
  topic via the **backplane** (in-memory here; swap in Redis to scale out).

## Next steps

- [**Channels & the contract**](/guides/channels-contract) — every builder method,
  path params, validators, and the AsyncAPI/codegen path.
- [**RPC & acknowledgements**](/guides/rpc) — typed errors, `safeRequest`,
  timeouts, idempotency, and server → client RPC.
- [**Presence & live cursors**](/guides/presence-cursors) — rosters and smoothed cursors.
- [**React & Solid bindings**](/guides/react-solid) — use it from a UI framework.
