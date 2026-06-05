---
name: channels
description: The Channel builder — events, commands, RPC, server-RPC, streams, path params, validators, typed context (derive/resolve), lifecycle hooks, and cross-node admin/broadcast APIs.
---

# Channels

A `Channel` is the contract. It is a chainable builder; each method widens the
channel's type. The same value drives server validation, client inference, and the
AsyncAPI document. **Each channel is its own WebSocket route** (path-per-channel).

```ts
import { Channel } from "ws-asyncapi";
const chat = new Channel("/chat/:room", "chat"); // (pathPattern, name)
```

## Path parameters

`:param` segments are captured and available to handlers via `request.params`. The
client must connect to a concrete path matching the pattern (`/chat/general`).

Optionally constrain room/topic literal types with `.$typeChannels<...>()`:

```ts
new Channel("/chat/:room", "chat").$typeChannels<`room:${string}`>();
```

## Messages

### Events (server → client)

```ts
.serverMessage("message", z.object({ from: z.string(), text: z.string() }))
```

The server emits these (via `ws.publish` / `channel.publish`); the client reads
them with `client.onEvent("message", cb)`.

### Commands (client → server, fire-and-forget)

```ts
.clientMessage(
    "typing",
    ({ ws, message }) => ws.publish("room", "typing", message), // handler
    z.object({ on: z.boolean() }),                              // schema
)
```

Note the argument order: `(name, handler, schema)`. Client calls
`client.call("typing", { on: true })`.

### RPC (client → server, typed reply)

```ts
import { RpcError } from "ws-asyncapi";

.rpc(
    "transfer",
    z.object({ to: z.string(), amount: z.number().positive() }), // input
    z.object({ balance: z.number() }),                           // output
    async ({ message, ws, /* ...ctx */ }) => {
        if (message.amount > balance) throw new RpcError("INSUFFICIENT", "no", { short: 1 });
        return { balance: debit(message.amount) };
    },
    { INSUFFICIENT: z.object({ short: z.number() }) },           // typed errors (optional)
)
```

Client: `await client.request("transfer", input)` (throws) or
`client.safeRequest(...)` (discriminated result). See
[client.md](client.md) for error handling.

### Server-RPC (server → client, typed reply)

```ts
.serverRpc("whoAreYou", z.object({}), z.object({ name: z.string() }))
```

The server calls `ws.request("whoAreYou", {})`; the client answers with
`client.onRequest("whoAreYou", async () => ({ name: "Alice" }))`.

### Streams (server → client, many values)

```ts
.stream(
    "ticks",
    z.object({ symbol: z.string() }),
    z.object({ price: z.number() }),
    async function* ({ message, signal }) {
        while (!signal.aborted) {
            yield { price: await quote(message.symbol) };
            await sleep(1000);
        }
    },
)
```

`signal` is an `AbortSignal` that fires when the client cancels (breaks the loop)
or disconnects — use it to stop work and clean up. Client:
`for await (const t of client.stream("ticks", { symbol: "ACME" })) { … }`.

Names must be **unique** across serverMessage/clientMessage/rpc/serverRpc/stream
within a channel (the builder rejects collisions when the doc is generated).

## Validators

Any [Standard Schema](https://standardschema.dev) validator (zod, valibot,
arktype). The schema's **input** shape validates inbound payloads; its **output**
(parsed) shape is what handlers and the client see, so defaults and transforms
flow through. This includes the `.query`/`.headers` schemas.

## Typed context: `derive` / `resolve`

Accumulate per-connection context (auth, DI, state). Returned fields are merged
into the object every handler receives (Elysia-style).

```ts
new Channel("/chat/:room", "chat")
    .derive(({ request }) => ({ token: request.query.token }))      // sync
    .resolve(async ({ token }) => ({ user: await loadUser(token) })) // async
    .rpc("me", z.object({}), z.object({ id: z.string() }),
        async ({ user }) => ({ id: user.id })); // `user` is typed here
```

Errors thrown in `derive`/`resolve` surface to RPC callers as errors (throw an
`RpcError` with a declared code for typed `data`). See [auth.md](auth.md).

## Lifecycle hooks

```ts
new Channel("/room/:id", "room")
    .onOpen(({ ws, request }) => ws.subscribe("room"))   // subscribe to topics here
    .onClose(({ ws }) => {/* cleanup */})
    .beforeMessage(({ message }) => {/* per-message middleware: auth, rate-limit */})
    .onError(({ error }) => console.error(error));
```

## The `ws` handle (inside handlers)

- `ws.subscribe(topic)` / `ws.unsubscribe(topic)` — room membership
- `ws.publish(topic, event, data)` — fan an event to a topic (via the backplane)
- `ws.broadcast(topic, event, data)` — publish excluding the sender
- `ws.request(name, input)` — invoke a `serverRpc` on this client (typed reply)
- `ws.id`, `ws.isSubscribed(topic)`

## Channel-level admin & broadcasting (cluster-wide)

These work across nodes when a Redis backplane is configured:

```ts
channel.publish(topic, event, data);          // emit to a room from outside a handler
channel.toSocket(socketId, event, data);      // targeted send to one socket, cluster-wide
channel.fetchSockets(room?);                   // → RemoteSocketInfo[] ({ id, rooms })
channel.socketsJoin(rooms, room?);             // force sockets to join topics
channel.socketsLeave(rooms, room?);
channel.disconnectSockets(room?);              // force-disconnect
channel.serverSideEmit(event, data);           // server ↔ server (other nodes)
channel.onServerEvent(event, (data) => {});    // receive serverSideEmit
```

## Presence, history, auth

Declared on the same builder — see [presence-cursors.md](presence-cursors.md) and
[auth.md](auth.md):

```ts
.presence(z.object({ name: z.string(), cursor: z.object({ x: z.number(), y: z.number() }).nullable() }))
.history("message", { keep: 50 })
.onAuth(z.object({ token: z.string() }), ({ credentials }) => ({ userId: verify(credentials.token) }))
```
