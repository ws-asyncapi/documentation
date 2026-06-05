---
name: adapters-scaling
description: Serving channels with the Node (ws) and Elysia adapters, the backplane interface, Redis scaling with recovery and history TTL, the msgpack codec, and the external emitter for non-server processes.
---

# Adapters & scaling

## Node adapter (`@ws-asyncapi/adapter-node`)

```ts
import { createNodeWsServer } from "@ws-asyncapi/adapter-node";

const { wss, close } = createNodeWsServer([chat, board], {
    port: 3000,            // or: server (an existing http.Server)
    codec: jsonCodec,      // optional
    backplane: new LocalBackplane(), // optional (default)
    maxPayload: 1 << 20,   // 1 MiB cap; oversized → close 1009
});

// graceful drain (close clients 1001, wait, then terminate)
// const server = createNodeWsServer(...); await server.drain(10_000);
await close();
```

Path-per-channel matcher; query/headers are parsed from the upgrade request.

## Elysia adapter (`@ws-asyncapi/adapter-elysia`)

```ts
import { Elysia } from "elysia";
import { wsAsyncAPIAdapter } from "@ws-asyncapi/adapter-elysia";

new Elysia()
    .use(wsAsyncAPIAdapter([chat], { codec, backplane, maxPayload }))
    .listen(3000);
```

Both adapters share the same transport-agnostic dispatcher, so behavior is
identical — pick by runtime.

## Backplane

The backplane fans messages across nodes and stores rooms, presence, and history.

- **`LocalBackplane`** (default) — in-memory; single process. Powers rooms,
  presence, history, and recovery on one node.
- **`RedisBackplane`** (`@ws-asyncapi/backplane-redis`) — cluster-wide via ioredis
  pub/sub + Redis data structures.

```ts
import { RedisBackplane } from "@ws-asyncapi/backplane-redis";

const backplane = new RedisBackplane({
    // ioredis connection options or an existing client
    recovery: true,      // enable connection-state recovery (offset log + sessions)
    historyTTL: 3_600_000, // sliding TTL (ms) for per-room history keys
});

createNodeWsServer([chat], { port: 3000, backplane });
```

Run identical server instances behind a load balancer; the Redis backplane makes
rooms, presence, history, broadcasts, and admin ops cluster-wide. Presence uses a
Redis HASH per room (self-cleaning on disconnect); history uses a capped LIST per
room with a sliding TTL. Recovery (opt-in) keeps an offset log + session keys so a
reconnecting client replays missed room events.

## Codec (`@ws-asyncapi/codec-msgpack`)

The default is JSON. Swap in msgpack for smaller frames — the **whole cluster and
all clients must share one codec** (confirmed in the handshake).

```ts
import { msgpackCodec } from "@ws-asyncapi/codec-msgpack";
createNodeWsServer([chat], { port: 3000, codec: msgpackCodec });
// client: createClient<typeof chat>(url, path, { codec: msgpackCodec });
```

## External emitter (`@ws-asyncapi/emitter`)

Publish to clients from a process that isn't a server (a worker, a cron job, a
microservice) by sharing a backplane with the servers:

```ts
import { createEmitter } from "@ws-asyncapi/emitter";
import { RedisBackplane } from "@ws-asyncapi/backplane-redis";

const emitter = createEmitter<typeof chat>(new RedisBackplane({ /* same Redis */ }));
emitter.publish("room:42", "message", { from: "system", text: "deploy done" });
emitter.toSocket(socketId, "message", { from: "system", text: "hi" });
await emitter.close();
```

One-way only (no acks/presence), typed to the channel's events.

## Testing (`@ws-asyncapi/testing`)

In-memory harness that reuses the real dispatcher over a linked socket pair — high
fidelity, fast, synchronous:

```ts
import { createTestHarness } from "@ws-asyncapi/testing";

const h = createTestHarness(chat);
const a = h.connect();        // typed client
const b = h.connect();
await a.opened;
const { id } = await a.request("send", { text: "hi" });
await h.close();
```
