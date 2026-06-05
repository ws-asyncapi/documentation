---
name: client
description: The typed client — createClient options, events, request/safeRequest, typed errors, streams, reconnection, heartbeat, connection-state recovery, offline buffering, and idempotency.
---

# Client

`@ws-asyncapi/client` is a single framed dispatcher with a pending table,
reconnection, and recovery — typed entirely from the channel contract.

```ts
import { createClient } from "@ws-asyncapi/client";
import type { chat } from "./server";

const client = createClient<typeof chat>("ws://localhost:3000", "/chat/general");
await client.opened; // resolves on the Welcome handshake
```

`createClient<C>(url, path, options?)`. `path` must match the channel's pattern.

## Options (`WebsocketAsyncAPIOptions`)

```ts
createClient<typeof chat>("ws://localhost:3000", "/chat/general", {
    query: { token: "jwt" },        // appended to the URL
    headers: { "x-app": "web" },    // SSR/parity only — browsers can't set WS headers
    codec: jsonCodec,               // default JSON; see codec-msgpack
    reconnect: true,                // or { maxRetries, baseDelay, maxDelay }
    heartbeat: true,                // or { interval, timeout }
    requestTimeout: 30_000,         // default RPC timeout (ms)
    maxBufferSize: 1024,            // max outbound frames buffered while offline
    presenceThrottle: 50,           // coalesce volatile presence.update (cursors)
    socket: (url) => new WebSocket(url), // custom transport (SSR/RN/in-memory tests)
    contractVersion: contractHash(chat), // optional contract drift check
});
```

## Events

```ts
const off = client.onEvent("message", (m) => {/* m typed */});
off(); // unsubscribe
```

## RPC

```ts
// throws on failure
const out = await client.request("transfer", { to: "bob", amount: 10 });

// per-call timeout + idempotency
await client.request("transfer", input, { timeout: 5_000, idempotencyKey: "op-123" });
```

An `idempotencyKey` makes a retried call run the handler once and replay the cached
result — safe retries across reconnects.

### Typed errors with `safeRequest`

```ts
const res = await client.safeRequest("transfer", { to: "bob", amount: 999 });
if (res.error) {
    if (res.error.code === "INSUFFICIENT") {
        res.error.data.short; // typed by the declared error code
    }
    // built-in codes: VALIDATION | NOT_FOUND | INTERNAL | TIMEOUT | OVERLOADED | UNAUTHENTICATED
} else {
    res.data; // typed output
}
```

`request` throws an `RpcError`; `safeRequest` returns a discriminated
`{ data, error }`. `TIMEOUT` is synthesized client-side.

## Commands & server-RPC

```ts
client.call("typing", { on: true });                       // fire-and-forget command
client.onRequest("whoAreYou", async () => ({ name: "A" })); // answer a serverRpc
```

## Streams

```ts
for await (const tick of client.stream("ticks", { symbol: "ACME" })) {
    render(tick); // tick typed as the stream's output
}
// breaking the loop cancels the stream server-side (StreamStop → AbortSignal)
```

A server-side error throws an `RpcError` into the loop. Streams do **not** survive
reconnects (re-open them after `onRecover`).

## Connection state & recovery

```ts
client.connected;   // boolean
client.sessionId;   // stable across reconnects
client.recovered;   // did the last reconnect replay missed events?
client.onOpen(cb); client.onClose(cb); client.onError(cb);
client.onRecover((recovered) => { if (!recovered) refetchEverything(); });
```

Reconnection (backoff + jitter), heartbeats (dead-connection detection), offline
buffering, and connection-state recovery (replay of missed **room** events) are on
by default. On a failed recovery (`recovered === false`), re-fetch state and
re-open streams.

## Presence, history, auth (client side)

See [presence-cursors.md](presence-cursors.md) and [auth.md](auth.md):

```ts
await client.presence.set({ name: "Alice", cursor: null });
client.presence.update({ cursor: { x, y } });            // volatile (cursors)
client.presence.subscribe((members) => render(members)); // Map<id, state>
const backlog = await client.history("room:42", { limit: 50 });
await client.authenticate({ token: freshToken });
```

## Cleanup

```ts
client.close(); // stops reconnection and closes the socket
```
