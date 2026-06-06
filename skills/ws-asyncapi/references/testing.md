---
name: testing
description: In-memory test harness (@ws-asyncapi/testing) — createTestHarness, typed clients with no sockets/ports, multi-client fan-out, streams, server plugins, and simulating cluster nodes via a shared backplane.
---

# Testing (`@ws-asyncapi/testing`)

In-memory harness that runs the **real** dispatcher + `WebSocketNode` over a linked
in-memory pipe — no sockets, no ports, no `listen()`. High fidelity (RPC, typed
errors, events, rooms, broadcast, server→client RPC, streams, presence, and
connection-state-recovery all behave as in production), fast, and synchronous to set
up. Peers: `ws-asyncapi`, `@ws-asyncapi/client`, `@ws-asyncapi/adapter-node`.

```ts
import { expect, test } from "bun:test"; // or vitest / jest
import { createTestHarness } from "@ws-asyncapi/testing";
import { chat } from "./server"; // your Channel

test("history RPC", async () => {
    const h = createTestHarness(chat);
    const client = h.connect();      // WsClient<InferClient<typeof chat>>
    await client.opened;

    const { items } = await client.request("history", { limit: 10 });
    expect(items).toHaveLength(10);

    await h.close();
});
```

Everything is typed from the channel — `request`, `safeRequest`, `onEvent`, `call`,
`stream`, `onRequest` infer argument/result types; wrong names or payloads are
compile errors.

## API

- `createTestHarness(channel, options?)` → `TestHarness`
  - `options.codec` — wire codec (default JSON; client & server share it).
  - `options.backplane` — default a fresh `LocalBackplane` with **recovery on**;
    pass a shared one to simulate a cluster.
  - `options.plugins` — `ServerPlugin[]` (metrics/tracing/logging).
- `TestHarness`:
  - `.connect(options?)` → typed client. `options` = `{ path?, query?, headers? }`;
    `path` defaults to the channel address with `:params` filled `1`.
  - `.backplane` — the backplane it drives (publish to it to simulate other nodes).
  - `.channel` — the channel under test.
  - `.close()` — disconnect all clients and close the backplane.

## Multiple clients (fan-out / presence)

```ts
const h = createTestHarness(chat);
const a = h.connect();
const b = h.connect();
await Promise.all([a.opened, b.opened]);

b.onEvent("message", (m) => received.push(m));
a.call("say", { text: "hi" }); // broadcasts to the room → b receives it
```

## Streams

```ts
for await (const tick of client.stream("prices", { symbol: "ACME" })) { /* ... */ }
```

## Cross-node behavior

Pass a **shared** backplane to two harnesses (or publish via `h.backplane` / an
external emitter) to assert cluster fan-out and recovery:

```ts
const h = createTestHarness(chat, { backplane, codec });
```

## Server plugins

```ts
const h = createTestHarness(chat, { plugins: [metrics] }); // ServerPlugin[]
```
