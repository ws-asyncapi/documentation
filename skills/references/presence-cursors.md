---
name: presence-cursors
description: Typed per-room presence rosters (set/update/subscribe/clear), volatile high-frequency updates, per-room history/rewind, and smoothed live multiplayer cursors with @ws-asyncapi/cursors.
---

# Presence, history & live cursors

## Presence

Declare per-member state with `.presence(stateSchema)`. Each connection belongs to
one presence room, derived **server-side** from the connection's concrete address
(`/board/:id` → `#presence:/board/42`), so the client never names a room.

```ts
// server
export const board = new Channel("/board/:id", "board").presence(
    z.object({
        name: z.string(),
        cursor: z.object({ x: z.number(), y: z.number() }).nullable(),
    }),
);
```

```ts
// client — client.presence is typed by the schema
await client.presence.set({ name: "Alice", cursor: null }); // join; resolves with the roster
const off = client.presence.subscribe((members) => render(members)); // Map<id, state>
client.presence.get();        // cached roster snapshot
client.presence.self;         // this connection's socket id (once hydrated)
await client.presence.clear(); // leave (stay connected)
```

The last announced state is re-sent automatically after a reconnect.

## Volatile updates (the cursor hot path)

`presence.set` is acknowledged and reconciled — right for join/leave and
occasional changes. For high-frequency state (a moving cursor) use
`presence.update`:

```ts
client.presence.update({ cursor: { x: e.clientX, y: e.clientY } });
```

It's fire-and-forget, last-write-wins, **dropped while offline** (never buffered),
and merges into the last-known state (other fields preserved). Coalesce it with the
`presenceThrottle` client option (e.g. `50` ms ≈ 20 Hz). Use it for any
high-frequency ephemeral state: cursors, selections, scroll positions, drag.

## Live cursors (`@ws-asyncapi/cursors`)

Opt-in package that turns the roster into a smoothed `Map<id, {x, y}>` of everyone
else's cursor. The general libs stay opinion-free; cursors are a recipe on top.

```ts
import { cursorsStore } from "@ws-asyncapi/cursors";

const cursors = cursorsStore(client); // Subscribable<Map<id, {x, y}>>, self excluded
cursors.subscribe(() => paint(cursors.getSnapshot()));

window.addEventListener("pointermove", (e) =>
    client.presence.update({ cursor: { x: e.clientX, y: e.clientY } }),
);
```

- Custom field: `cursorsStore(client, { field: (s) => s.pointer })`.
- Smoothing: default zero-dep rAF lerp; `{ smoothing: false }` for raw last-write;
  `{ smoothing: (cb) => new PerfectCursor(cb) }` to drop in `perfect-cursors`
  (matches the `{ addPoint, dispose }` interface, never a dependency).
- Render labels/colors by joining cursor positions with the full presence roster on
  socket id.
- In React/Solid, bind with the generic `useStore` / `fromStore` — see
  [react-solid.md](react-solid.md).

Cursors are ephemeral: never persisted, never replayed on reconnect.

## History / rewind

Retain recent events per room so a (re)connecting client can fetch a backlog.

```ts
// server — keep the last 50 "message" events per room
new Channel("/chat/:room", "chat")
    .serverMessage("message", z.object({ from: z.string(), text: z.string() }))
    .history("message", { keep: 50 });
```

```ts
// client — discriminated over the channel's events
const recent = await client.history("room:42", { limit: 50 });
for (const entry of recent) {
    if (entry.event === "message") entry.data; // { from, text }
}
```

Only rooms the connection is subscribed to are readable. History is recorded on the
publishing node (covers all publish paths). With Redis, set `historyTTL` so
inactive rooms' backlogs expire.

## Presence vs CRDTs

Presence is an ephemeral last-write-wins map — perfect for cursors, selections, and
"who's online." It is not a merge engine for shared editable documents. For
collaboratively edited content use a CRDT (e.g. [Yjs](https://yjs.dev)) for the
document and ws-asyncapi as the transport; keep cursors/selections in presence.
