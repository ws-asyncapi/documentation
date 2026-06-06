---
title: Adapters (Node & Elysia)
head:
    - - meta
      - name: description
        content: Serve ws-asyncapi channels with the Node (ws) or Elysia adapter — identical protocol and features. Options, attaching to an existing HTTP server, broadcasting, the AsyncAPI document/UI, and graceful shutdown.
---

# Adapters

An **adapter** runs your channels over a real WebSocket server. The protocol lives
in `ws-asyncapi`'s shared, transport-agnostic dispatcher, so every adapter behaves
**identically** — RPC, rooms, presence, history, middleware, codecs, and
connection-state-recovery all work the same way. Pick the adapter that matches your
runtime.

| Adapter | Package | Built on |
| --- | --- | --- |
| Node | `@ws-asyncapi/adapter-node` | [`ws`](https://github.com/websockets/ws) |
| Elysia | `@ws-asyncapi/adapter-elysia` | [Elysia](https://elysiajs.com) (Bun) |

## Node adapter

```ts
import { z } from "zod";
import { Channel } from "ws-asyncapi";
import { createNodeWsServer } from "@ws-asyncapi/adapter-node";

const chat = new Channel("/chat/:room", "chat")
    .$typeChannels<`room:${string}`>()
    .serverMessage("message", z.object({ from: z.string(), text: z.string() }))
    .onOpen(({ ws }) => ws.subscribe("room:1"));

const { wss, drain, close } = createNodeWsServer([chat], { port: 3000 });
```

### Attach to an existing HTTP server

Run alongside Express/Fastify/`node:http` instead of opening a port:

```ts
import { createServer } from "node:http";

const server = createServer(app); // your Express/Fastify app
createNodeWsServer([chat], { server });
server.listen(3000);
```

### Graceful shutdown

For zero-downtime deploys, wire `drain()` to `SIGTERM`: it stops accepting
connections, sends every client a close `1001` so they reconnect elsewhere, waits
up to `graceMs`, then terminates stragglers and closes the backplane. With
[connection-state-recovery](/guides/scaling#connection-state-recovery) the
reconnect replays anything missed.

```ts
process.on("SIGTERM", () => drain(10_000));
```

## Elysia adapter

```ts
import { Elysia } from "elysia";
import { wsAsyncAPIAdapter } from "@ws-asyncapi/adapter-elysia";

new Elysia()
    .use(wsAsyncAPIAdapter([chat], { /* codec, backplane, maxPayload, plugins */ }))
    .listen(3000);
```

## Options

Both adapters take the same options:

| Option | Default | Purpose |
| --- | --- | --- |
| `port` *(node)* | — | Open a server on this port (ignored if `server` is given) |
| `server` *(node)* | — | Attach to an existing `node:http` server |
| `codec` | JSON | Wire [codec](/guides/scaling#codecs) — must match the client |
| `backplane` | `LocalBackplane` | [Scaling backplane](/guides/scaling) (rooms, presence, history) |
| `maxPayload` | 1 MiB | Max inbound message bytes; larger frames are rejected with close `1009` before they're buffered (decode-bomb guard) |
| `plugins` | — | [Server-level plugins](/guides/channels-contract#plugins-use) (metrics/tracing) |

## Broadcasting from anywhere

A channel value can publish to a room from outside any handler — a cron, a webhook,
a job queue:

```ts
chat.publish("room:1", "message", { from: "clock", text: new Date().toISOString() });
```

Across multiple server instances, this requires a shared backplane — see
[Scaling](/guides/scaling). To emit from a process that **isn't** running a server,
use the [external emitter](/guides/scaling#external-emitter).

## Serving the AsyncAPI document & UI

Every channel emits a standard AsyncAPI 3.0 document. Serve it (and an interactive
UI) from any HTTP route:

```ts
import { getAsyncApiDocument, getAsyncApiUI } from "ws-asyncapi";

const doc = getAsyncApiDocument([chat]);   // JSON contract → GET /asyncapi.json
const html = getAsyncApiUI([chat]);        // rendered docs page → GET /docs
```

See [AsyncAPI & codegen](/guides/codegen) for generating a client from this
document.

## Next

- [**Scaling & the backplane**](/guides/scaling)
- [**Testing**](/guides/testing)
- [**AsyncAPI & codegen**](/guides/codegen)
