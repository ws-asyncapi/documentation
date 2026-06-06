---
title: Why ws-asyncapi
head:
    - - meta
      - name: description
        content: ws-asyncapi combines Socket.IO-grade runtime reliability with tRPC-grade end-to-end types, generated from a single contract that also produces an AsyncAPI 3.0 document.
---

# Why ws-asyncapi

**ws-asyncapi** is a contract-first WebSocket framework for TypeScript. You declare a
**channel** once on the server, and the browser client is fully typed from that
same declaration — every event, command, RPC, stream, and presence shape flows
end to end with no `any` and no manual codegen step.

The thesis in one line: **Socket.IO's runtime + tRPC-grade end-to-end types + AsyncAPI docs.**

## The gap it fills

If you reach for raw WebSockets, you write your own message framing, reconnection,
acknowledgements, rooms, and you hand-maintain the types on both ends. If you reach
for [Socket.IO](https://socket.io), you get a great runtime — rooms, acks,
reconnection, horizontal scaling — but the contract between client and server is
untyped strings and payloads. If you reach for [tRPC](https://trpc.io), you get
beautiful end-to-end types, but it's request/response over HTTP, not a live
bidirectional socket with events, streams, and presence.

ws-asyncapi takes the runtime you'd want from Socket.IO and the type-safety you'd
want from tRPC, and derives **both** — plus an [AsyncAPI 3.0](https://www.asyncapi.com)
document — from a single source of truth.

## What you get

- **End-to-end types from one contract.** `createClient<typeof channel>()` infers
  the entire client surface. No build step, no generated files in your repo.
- **RPC with acknowledgements.** `await client.request(...)` resolves with a typed
  output or rejects with a typed, discriminated error. Timeouts and idempotency
  keys are built in.
- **Server streams.** Declare an async generator on the server; consume it with
  `for await` on the client. Backpressure and cancellation handled for you.
- **Typed presence & history.** A per-room roster of who's connected and their
  typed state, plus per-room event history/rewind for backlogs.
- **Live cursors.** A volatile presence path plus the opt-in
  [`@ws-asyncapi/cursors`](/guides/presence-cursors) package for smoothed
  multiplayer cursors.
- **Resilience.** Auto-reconnect with backoff and jitter, heartbeats, offline
  buffering, and connection-state recovery (replay of missed events).
- **Scale-out.** A pluggable backplane — in-memory for a single node, Redis for a
  cluster — powers rooms, presence, and recovery across instances.
- **Framework bindings.** Thin [React and Solid](/guides/react-solid) bindings over
  a framework-agnostic `query-core` map RPCs onto TanStack Query and bridge
  presence/streams into hooks and signals.

## How it fits together

```
            ┌──────────────────────────────────────────────┐
            │  Channel  (the contract: events, RPC, streams,│
            │           presence, history, auth)            │
            └───────────────┬──────────────────┬───────────┘
                            │                  │
              infers        │                  │  emits
        createClient<typeof │ channel>         │  AsyncAPI 3.0 doc → CLI codegen
                            │                  │
        ┌───────────────────▼──┐         ┌─────▼───────────────────┐
        │  Typed browser client │  ⇄ WS ⇄ │  Adapter (Node / Elysia)│
        │  events · request ·   │         │  + Backplane            │
        │  stream · presence    │         │  (local / Redis)        │
        └───────────────────────┘         └─────────────────────────┘
```

- A **`Channel`** is the contract. It's a chainable builder: `.serverMessage()`,
  `.clientMessage()`, `.rpc()`, `.stream()`, `.presence()`, `.history()`, `.onAuth()`.
- An **adapter** hosts channels on a server runtime
  ([`@ws-asyncapi/adapter-node`](/get-started) or `@ws-asyncapi/adapter-elysia`).
- A **backplane** fans messages across nodes and stores rooms/presence/history
  (in-memory by default, Redis for clusters).
- The **client** (`@ws-asyncapi/client`) is a single framed dispatcher with a
  pending table, reconnection, and recovery — typed entirely from the contract.

## When to use it

Reach for ws-asyncapi when you want a **live, bidirectional, typed** channel:
chat and collaboration, multiplayer presence and cursors, live dashboards and
tickers, notifications, or any feature where the server pushes typed data and the
client makes typed calls back.

If all you need is request/response, plain tRPC or REST is simpler. If you need
shared, mergeable editable documents (CRDTs), pair ws-asyncapi as the transport
with a CRDT library — see the [presence & cursors guide](/guides/presence-cursors)
for where presence ends and CRDTs begin.

## Next steps

- [**Get started**](/get-started) — stand up a server and a typed client in a few minutes.
- [**Channels & the contract**](/guides/channels-contract) — the full builder surface and the codegen path.
- [**RPC & acknowledgements**](/guides/rpc) — typed calls, errors, timeouts, idempotency.
- [**Presence & live cursors**](/guides/presence-cursors) — rosters, volatile updates, smoothed cursors.
- [**React & Solid bindings**](/guides/react-solid) — hooks and signals over TanStack Query.
