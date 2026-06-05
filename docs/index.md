---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

title: ws-asyncapi — Contract-first WebSockets for TypeScript

head:
    - - meta
      - name: description
        content: ws-asyncapi is a contract-first WebSocket framework for TypeScript. Declare one Channel and get an end-to-end typed client — events, RPC with acknowledgements, streams, presence, history, and live cursors. Socket.IO's runtime with tRPC-grade types.
    - - meta
      - name: keywords
        content: websocket, typescript, contract-first, asyncapi, socket.io alternative, rpc, end-to-end types, presence, live cursors, streams, react websocket, solid websocket, type-safe websocket

hero:
    name: ws-asyncapi
    text: Contract-first WebSockets, end-to-end typed.
    tagline: Declare one channel — get a typed client with RPC, streams, presence, and live cursors. Socket.IO's runtime, tRPC-grade types.
    actions:
        - theme: brand
          text: Get started →
          link: /get-started
        - theme: alt
          text: Why ws-asyncapi
          link: /introduction
        - theme: alt
          text: GitHub
          link: https://github.com/ws-asyncapi

features:
    - icon: 🔗
      title: One contract, both sides typed
      details: Define a <code>Channel</code> on the server; the browser client infers every event, command, RPC, and stream from <code>typeof channel</code> — no codegen step required.
    - icon: 📡
      title: RPC with real acknowledgements
      details: <code>await client.request("getRoom", input)</code> resolves with the typed output, or rejects with a typed, discriminated error. Timeouts and idempotency keys built in.
    - icon: 🌊
      title: Streams, presence & history
      details: Async-iterable server streams, a per-room typed presence roster, and per-room event history/rewind — all first-class, all typed.
    - icon: 🖱️
      title: Live cursors, batteries optional
      details: A volatile presence channel plus the opt-in <a href="/guides/presence-cursors">@ws-asyncapi/cursors</a> package gives you smoothed multiplayer cursors in a few lines.
    - icon: ♻️
      title: Resilient by default
      details: Auto-reconnect with backoff, heartbeats, offline buffering, and connection-state recovery (replay missed events) — single-node or across a Redis backplane.
    - icon: ⚛️
      title: React & Solid bindings
      details: Thin bindings over a framework-agnostic <code>query-core</code> map RPCs to TanStack Query and bridge presence/streams into hooks and signals.
---

## See it in action

::: code-group

```ts [server.ts]
import { Channel } from "ws-asyncapi";
import { createNodeWsServer } from "@ws-asyncapi/adapter-node";
import { z } from "zod";

export const chat = new Channel("/chat/:room", "chat")
    // server → client event
    .serverMessage("message", z.object({ from: z.string(), text: z.string() }))
    // client → server RPC with a typed reply
    .rpc(
        "send",
        z.object({ text: z.string() }),
        z.object({ id: z.string() }),
        async ({ message, ws }) => {
            const id = crypto.randomUUID();
            ws.publish("room", "message", { from: "me", text: message.text });
            return { id };
        },
    )
    .onOpen(({ ws }) => ws.subscribe("room"));

createNodeWsServer([chat], { port: 3000 });
```

```ts [client.ts]
import { createClient } from "@ws-asyncapi/client";
import type { chat } from "./server";

// fully typed from the server contract — no codegen
const client = createClient<typeof chat>("ws://localhost:3000", "/chat/general");

client.onEvent("message", (m) => {
    // m: { from: string; text: string }
    console.log(`${m.from}: ${m.text}`);
});

const { id } = await client.request("send", { text: "hello!" });
//      ^ string — inferred from the contract
```

:::

> Prefer a generated client over `typeof channel`? ws-asyncapi emits an **AsyncAPI 3.0** document and ships a CLI that generates an equivalent typed client. See [Channels & the contract](/guides/channels-contract).
