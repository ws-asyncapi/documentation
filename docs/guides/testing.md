---
title: Testing
head:
    - - meta
      - name: description
        content: Test ws-asyncapi channels in-memory with @ws-asyncapi/testing — a fully-typed client over the real dispatcher, no sockets or ports. RPC, events, rooms, broadcast, streams, presence, recovery, and multi-node simulation.
---

# Testing

`@ws-asyncapi/testing` gives you an **in-memory test harness**: connect a
fully-typed client to a channel with **no sockets, no ports, no `listen()`**. It
runs the *real* dispatcher and the *real* `WebSocketNode` implementation over an
in-memory pipe, so your tests exercise the actual protocol — RPC, typed errors,
events, rooms, broadcast, server→client RPC, streams, and connection-state-recovery
all behave exactly as in production.

```bash
npm install -D @ws-asyncapi/testing
# peers: ws-asyncapi, @ws-asyncapi/client, @ws-asyncapi/adapter-node
```

## Basic test

```ts
import { expect, test } from "bun:test"; // or vitest / jest
import { createTestHarness } from "@ws-asyncapi/testing";
import { chat } from "./server"; // your Channel

test("history RPC", async () => {
    const h = createTestHarness(chat);
    const client = h.connect(); // typed client, inferred from `chat`
    await client.opened;

    const { items } = await client.request("history", { limit: 10 });
    expect(items).toHaveLength(10);

    await h.close();
});
```

Everything is typed straight from the channel — `request`, `onEvent`, `call`,
`safeRequest`, `stream`, `onRequest` all infer their argument and result types, and
wrong names or payloads are compile errors.

## Multiple clients (fan-out, presence)

```ts
const h = createTestHarness(chat);
const a = h.connect();
const b = h.connect();
await Promise.all([a.opened, b.opened]);

const received: unknown[] = [];
b.onEvent("message", (m) => received.push(m));
a.call("say", { text: "hi" }); // broadcasts to the room → b receives it
```

## Streams

```ts
for await (const tick of client.stream("prices", { symbol: "ACME" })) {
    // ...
}
```

## Simulating other cluster nodes

The harness drives a real backplane (a fresh `LocalBackplane` with recovery on, by
default). Pass a **shared** backplane to test cross-node behavior — or publish
through `h.backplane` / point an [external emitter](/guides/scaling#external-emitter)
at it.

```ts
const h = createTestHarness(chat, { backplane, codec });
// h.backplane — publish to it to simulate events from another node
```

## Options

`createTestHarness(channel, options?)`:

| Option | Default | Purpose |
| --- | --- | --- |
| `codec` | JSON | Wire codec (client and server share it automatically) |
| `backplane` | fresh `LocalBackplane` (recovery on) | Share one to simulate a cluster |
| `plugins` | — | [Server-level plugins](/guides/channels-contract#plugins-use) (metrics/tracing) |

`h.connect(options?)` accepts `{ path?, query?, headers? }` — `path` defaults to the
channel address with params filled `1`.

## Next

- [**RPC & acknowledgements**](/guides/rpc)
- [**Scaling & the backplane**](/guides/scaling)
- [**Channels & the contract**](/guides/channels-contract)
