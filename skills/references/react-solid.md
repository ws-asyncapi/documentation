---
name: react-solid
description: React (@ws-asyncapi/react) hooks and Solid (@ws-asyncapi/solid) primitives over a framework-agnostic query-core — RPCs as TanStack Query, presence/streams/events as hooks/signals, and binding any Subscribable store (e.g. cursors).
---

# React & Solid bindings

Thin bindings over `@ws-asyncapi/query-core`. RPCs map onto
[TanStack Query](https://tanstack.com/query); presence/streams/events/connection
are reactive stores bridged into each framework's primitive.

## React (`@ws-asyncapi/react`)

Needs `@tanstack/react-query` and a `QueryClientProvider` in the tree.

```tsx
// ws.ts — one client per app, module scope
import { createReactClient } from "@ws-asyncapi/react";
import type { chat } from "./server";
export const ws = createReactClient<typeof chat>("ws://localhost:3000", "/chat/general");
```

```tsx
function Room() {
    const history = ws.useHistory("room:general", { liveEvent: "message", limit: 50 });
    const send = ws.useMutate("send");                 // RPC as mutation
    const { members, set, update } = ws.usePresence();  // roster
    const price = ws.useStream("prices", { symbol: "ACME" }); // latest value
    const { connected } = ws.useConnection();

    return <button onClick={() => send.mutate({ text: "hi" })}>{members.size} online</button>;
}
```

| Hook | Purpose |
| --- | --- |
| `useRequest(name, input, opts?)` | RPC as a TanStack query |
| `useMutate(name, opts?)` | RPC as a TanStack mutation |
| `useStream(name, input, opts?)` | stream (latest by default; `{ reduce: "append", max? }` to accumulate; `{ reduce, initial }` to fold) |
| `usePresence()` | `{ members, self, set, update, clear }` |
| `useHistory(room, opts?)` | backlog (+ `liveEvent` to append live) |
| `useLastEvent(name)` | latest payload of a server event |
| `useEvent(name, handler)` | imperative event subscription |
| `useConnection()` | `{ connected, recovered }` |
| `useStore(store)` | bind any `Subscribable` (e.g. cursors) to a React value |

## Solid (`@ws-asyncapi/solid`)

Needs `@tanstack/solid-query`. Same shape; methods are `create*` and return
accessors.

```tsx
import { createSolidClient } from "@ws-asyncapi/solid";
export const ws = createSolidClient<typeof chat>("ws://localhost:3000", "/chat/general");

function Room() {
    const history = ws.createRequest("history", { limit: 50 }); // history.data reactive
    const presence = ws.createPresence();                       // presence.members()
    return <div>{presence.members().size} online</div>;
}
```

Surface mirrors React: `createRequest`, `createMutate`, `createStream`,
`createPresence`, `createHistory`, `createLastEvent`, `createEvent`,
`createConnection`, and `fromStore` (bind any `Subscribable` to an `Accessor`).

## Streams: latest vs accumulate

```tsx
const price = ws.useStream("prices", { symbol: "ACME" });        // latest item | undefined
const feed = ws.useStream("events", {}, { reduce: "append", max: 200 }); // Item[]
```

Latest is the default (O(1), no accumulation) — accumulate only when you need the
list.

## Binding cursors (and any custom store)

`@ws-asyncapi/cursors` exposes a `Subscribable`; bind it with the generic hook (no
cursor-specific API in the bindings):

```tsx
import { useStore } from "@ws-asyncapi/react";
import { cursorsStore } from "@ws-asyncapi/cursors";
import { useMemo } from "react";

const cursors = useStore(useMemo(() => cursorsStore(ws.client), []));
// {[...cursors].map(([id, { x, y }]) => <Cursor key={id} x={x} y={y} />)}
```

`ws.client` is the underlying, precisely-typed client — the escape hatch for
anything the hooks don't wrap (`opened`, raw `request`, `presence.update`, …).
