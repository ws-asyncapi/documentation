---
title: Scaling & the backplane
head:
    - - meta
      - name: description
        content: Scale ws-asyncapi horizontally with the Redis backplane — cluster-wide rooms, presence, history, broadcasts, and connection-state-recovery. Plus the msgpack codec and the external emitter for non-server processes.
---

# Scaling & the backplane

A single ws-asyncapi server keeps rooms, presence, and history in memory. To run
**many** server instances behind a load balancer — so a `publish` on node A reaches
a client on node B — they share a **backplane**.

The backplane is the one seam that fans messages across nodes and stores rooms,
presence, and history. Swap it; everything else stays the same.

| Backplane | Package | Scope |
| --- | --- | --- |
| `LocalBackplane` | `ws-asyncapi` (default) | Single process / in-memory |
| `RedisBackplane` | `@ws-asyncapi/backplane-redis` | Cluster-wide (ioredis pub/sub + Redis data structures) |

## Local (default)

Nothing to configure — a single instance uses `LocalBackplane`, which powers rooms,
presence, history, and recovery on one node.

## Redis backplane

Run **identical** server instances behind a load balancer and give each the same
Redis. Rooms, presence, history, broadcasts, and admin ops become cluster-wide.

```ts
import { createNodeWsServer } from "@ws-asyncapi/adapter-node";
import { RedisBackplane } from "@ws-asyncapi/backplane-redis";

const backplane = new RedisBackplane({
    url: "redis://localhost:6379", // or pass `redisOptions` (ioredis) directly
    recovery: true,                // enable connection-state-recovery
    historyTTL: 3_600_000,         // sliding TTL (ms) for per-room history keys
});

createNodeWsServer([chat], { port: 3000, backplane });
```

Under the hood: a single Redis channel fans every frame to all nodes (each delivers
locally, skipping the origin); presence is a self-cleaning Redis HASH per room;
history is a capped LIST per room with a sliding TTL so idle rooms expire instead of
leaking keys.

### Options

| Option | Default | Purpose |
| --- | --- | --- |
| `url` | — | Redis connection URL |
| `redisOptions` | — | ioredis options (use instead of `url`) |
| `prefix` | `"wsaa"` | Key/channel prefix |
| `recovery` | off | Enable recovery (see below) — `{ bufferSize?, sessionTTL? }` |
| `historyTTL` | 1h | Sliding TTL (ms) for room `.history` buffers |

## Connection-state-recovery

A dropped client can reconnect and **replay the room events it missed** instead of
silently losing them. Enable `recovery` on the backplane:

```ts
new RedisBackplane({
    url: "redis://localhost:6379",
    recovery: {
        bufferSize: 10_000,  // events retained in the replay log
        sessionTTL: 120_000, // how long a disconnected session stays recoverable (ms)
    },
});
```

Recovery mints a globally-monotonic offset per published event (one `INCR`) and
keeps a bounded replay log plus per-session room snapshots. On reconnect, the client
re-joins its rooms and receives everything after its last seen offset. The client
exposes `client.recovered` and an `onRecover(cb)` hook. Only **room broadcasts**
recover — not direct sends. (`LocalBackplane` has recovery on by default,
single-node.)

## Codecs

The wire format is pluggable. The default is JSON; swap in **MessagePack** for
smaller binary frames. The **whole cluster and all clients must share one codec** —
it's confirmed in the connection handshake.

```ts
import { msgpackCodec } from "@ws-asyncapi/codec-msgpack";

// server
createNodeWsServer([chat], { port: 3000, codec: msgpackCodec });
// client
createClient<typeof chat>(url, path, { codec: msgpackCodec });
```

## External emitter

To emit events from a process that **isn't** running a server — a background job, a
billing service, a cron — use `@ws-asyncapi/emitter` with a backplane shared with
your servers (the [`@socket.io/redis-emitter`](https://socket.io/docs/v4/redis-adapter/#emitter)
equivalent). The emitter publishes through the backplane; each server delivers to
its connected clients.

```ts
import { createEmitter } from "@ws-asyncapi/emitter";
import { RedisBackplane } from "@ws-asyncapi/backplane-redis";
import type { chat } from "./contract";

const emitter = createEmitter<typeof chat>(
    new RedisBackplane({ url: "redis://localhost:6379" }), // same Redis as the servers
);

// to a room — every client in room:1 across the cluster receives it
await emitter.publish("room:1", "message", { from: "billing", text: "paid" });
// to a single socket by id
await emitter.toSocket(socketId, "message", { from: "system", text: "hi" });
await emitter.close();
```

Event names and payloads are inferred from the channel's `serverMessage`
declarations, so a wrong name or shape is a compile error. The emitter is **one-way**
(emit to rooms/sockets only) — acknowledgements, presence, and inbound messages
need a running server. Its `codec` must match the servers'.

## Next

- [**Adapters**](/guides/adapters)
- [**Presence & live cursors**](/guides/presence-cursors)
- [**Testing**](/guides/testing) — simulate multiple cluster nodes in-memory
