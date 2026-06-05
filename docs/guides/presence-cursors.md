---
title: Presence & live cursors
head:
    - - meta
      - name: description
        content: Typed per-room presence rosters, volatile updates for high-frequency state, and smoothed multiplayer live cursors with the opt-in @ws-asyncapi/cursors package.
---

# Presence & live cursors

**Presence** is a per-room roster of who's connected and their typed state —
"Alice and Bob are here, Alice is typing." **Live cursors** are a specialization
of presence for the high-frequency case of broadcasting pointer positions.

## Declaring presence

Add `.presence(stateSchema)` to a channel. Each connection belongs to one
**presence room**, derived server-side from the connection's concrete address
(`/doc/:id` → `#presence:/doc/42`), so the client never names the room.

```ts
// server.ts
import { Channel } from "ws-asyncapi";
import { z } from "zod";

export const board = new Channel("/board/:id", "board").presence(
    z.object({
        name: z.string(),
        cursor: z.object({ x: z.number(), y: z.number() }).nullable(),
    }),
);
```

## The client roster

`client.presence` is typed by your schema:

```ts
const client = createClient<typeof board>("ws://localhost:3000", "/board/1");

// announce yourself — resolves once the server returns the current roster
await client.presence.set({ name: "Alice", cursor: null });

// observe the roster live (fires on every join/leave/update)
const off = client.presence.subscribe((members) => {
    // members: Map<socketId, { name; cursor }>
    render([...members.values()]);
});

// read the cached roster synchronously
client.presence.get();

// leave presence (stay connected); others get a leave diff
await client.presence.clear();
```

The last announced state is re-sent automatically after a reconnect, so a
member's presence survives a brief drop.

## Volatile updates — the cursor hot path

`presence.set` is acknowledged and reconciled — right for join/leave and
occasional state changes. For something that fires dozens of times a second (a
cursor), use **`presence.update`**:

```ts
client.presence.update({ cursor: { x: e.clientX, y: e.clientY } });
```

`update` is fire-and-forget, last-write-wins, **dropped while offline** (a stale
cursor is useless), and merges into the last-known state so other fields are
preserved. Coalesce it to a sane wire rate with `presenceThrottle`:

```ts
const client = createClient<typeof board>("ws://localhost:3000", "/board/1", {
    presenceThrottle: 50, // ~20 Hz on the wire; the receiver smooths between samples
});
```

## Live cursors with `@ws-asyncapi/cursors`

The general presence primitives above are deliberately opinion-free. The opt-in
[`@ws-asyncapi/cursors`](https://github.com/ws-asyncapi) package turns the
incoming roster into a smoothed `Map<id, {x, y}>` of everyone else's cursor,
ready to render.

::: pm-add @ws-asyncapi/cursors
:::

```ts
import { cursorsStore } from "@ws-asyncapi/cursors";

// others' cursors, smoothed to ~60fps even though the wire rate is ~20Hz
const cursors = cursorsStore(client); // Subscribable<Map<id, {x, y}>>
cursors.subscribe(() => paint(cursors.getSnapshot())); // yourself excluded
```

Send your own pointer with the volatile primitive:

```ts
window.addEventListener("pointermove", (e) =>
    client.presence.update({ cursor: { x: e.clientX, y: e.clientY } }),
);
```

### How it updates

`presence.update` coalesces to the latest per throttle window → one volatile diff
to the server (validate → last-write store → fan out, no ack) → the receiver's
`cursorsStore` feeds each peer's point into a smoother whose `requestAnimationFrame`
loop emits interpolated positions → a fresh `Map` snapshot → your render. Cursors
are ephemeral: never persisted, never replayed on reconnect.

### Smoothing

The default is a zero-dependency rAF lerp (degrades to passthrough without
`requestAnimationFrame`, e.g. SSR). Swap it:

```ts
cursorsStore(client, { smoothing: false }); // raw last-write
import { PerfectCursor } from "perfect-cursors"; // your install — optional
cursorsStore(client, { smoothing: (cb) => new PerfectCursor(cb) });
```

`perfect-cursors` already matches the smoother interface
(`{ addPoint([x, y]); dispose() }`), so it drops in without being a dependency.

In React/Solid, bind the store with the generic `useStore` / `fromStore` hook —
see [React & Solid bindings](/guides/react-solid).

## History & rewind

Related but distinct: `.history(eventName, { keep })` retains recent events of a
room so a (re)connecting client can fetch a backlog (e.g. the chat scrollback).

```ts
// server: retain the last 50 "message" events per room
new Channel("/chat/:room", "chat")
    .serverMessage("message", z.object({ from: z.string(), text: z.string() }))
    .history("message", { keep: 50 });
```

```ts
// client: fetch the backlog when opening a room
const recent = await client.history("room:42", { limit: 50 });
for (const entry of recent) {
    if (entry.event === "message") {
        // entry.data: { from: string; text: string } — discriminated on entry.event
    }
}
```

## Presence vs CRDTs

Presence is an ephemeral, last-write-wins map — perfect for cursors, selections,
and "who's online." It is **not** a merge engine for shared editable documents.
For collaboratively edited content (rich text, structured docs), use a CRDT
library like [Yjs](https://yjs.dev) for the document and ws-asyncapi as the
transport; keep cursors and selections in presence. Yjs "awareness" is itself just
an ephemeral last-write map — which is exactly what presence already gives you.

## Next

- [**React & Solid bindings**](/guides/react-solid) — presence and cursors as hooks/signals.
- [**Channels & the contract**](/guides/channels-contract) — where `.presence` and `.history` fit.
