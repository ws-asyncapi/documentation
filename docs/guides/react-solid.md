---
title: React & Solid bindings
head:
    - - meta
      - name: description
        content: Use ws-asyncapi from React or Solid — thin bindings over a framework-agnostic query-core that map RPCs onto TanStack Query and bridge presence, streams, and events into hooks and signals.
---

# React & Solid bindings

The framework bindings are thin layers over a shared, framework-agnostic
`@ws-asyncapi/query-core`. RPCs map onto [TanStack Query](https://tanstack.com/query)
(`useQuery` / `useMutation`); presence, streams, events, and connection state are
exposed as reactive stores that each binding bridges into its native primitive
(React hooks via `useSyncExternalStore`, Solid signals).

## React

::: pm-add @ws-asyncapi/react @tanstack/react-query
:::

Create one client per app and wrap your tree in a `QueryClientProvider`:

```tsx
// ws.ts
import { createReactClient } from "@ws-asyncapi/react";
import type { chat } from "./server";

export const ws = createReactClient<typeof chat>(
    "ws://localhost:3000",
    "/chat/general",
);
```

```tsx
// App.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const qc = new QueryClient();

export default function App() {
    return (
        <QueryClientProvider client={qc}>
            <Room />
        </QueryClientProvider>
    );
}
```

```tsx
// Room.tsx
import { ws } from "./ws";

function Room() {
    // RPC as a query — typed input & output, cached by TanStack Query
    const history = ws.useHistory("room:general", { liveEvent: "message", limit: 50 });

    // RPC as a mutation
    const send = ws.useMutate("send");

    // presence roster
    const { members, set, update } = ws.usePresence();

    // a server → client event, latest value
    const lastTyping = ws.useLastEvent("typing");

    return (
        <button onClick={() => send.mutate({ text: "hi" })}>
            {history.data?.length ?? 0} messages · {members.size} online
        </button>
    );
}
```

The React surface:

| Hook | Purpose |
| --- | --- |
| `useRequest(name, input, opts?)` | RPC as a TanStack query |
| `useMutate(name, opts?)` | RPC as a TanStack mutation |
| `useStream(name, input, opts?)` | consume a stream (latest value by default; `{ reduce: "append" }` to accumulate) |
| `usePresence()` | `{ members, self, set, update, clear }` |
| `useHistory(room, opts?)` | room backlog (with optional `liveEvent` to append live) |
| `useLastEvent(name)` | latest payload of a server event |
| `useEvent(name, handler)` | imperative event subscription |
| `useConnection()` | `{ connected, recovered }` |
| `useStore(store)` | bind **any** `Subscribable` (e.g. cursors) to a React value |

## Solid

::: pm-add @ws-asyncapi/solid @tanstack/solid-query
:::

Same shape, Solid primitives. Methods are `create*` and return accessors:

```tsx
import { createSolidClient } from "@ws-asyncapi/solid";
import type { chat } from "./server";

export const ws = createSolidClient<typeof chat>("ws://localhost:3000", "/chat/general");

function Room() {
    const history = ws.createRequest("history", { limit: 50 }); // history.data is reactive
    const presence = ws.createPresence();                       // presence.members()
    return <div>{presence.members().size} online</div>;
}
```

The Solid surface mirrors React: `createRequest`, `createMutate`, `createStream`,
`createPresence`, `createHistory`, `createLastEvent`, `createEvent`,
`createConnection`, and `fromStore` (bind any `Subscribable` into an `Accessor`).

## Streams

`useStream` / `createStream` default to the **latest value** (O(1), no
accumulation) — ideal for a price ticker or live gauge:

```tsx
const price = ws.useStream("prices", { symbol: "ACME" });
// price.data: latest item | undefined
```

Opt into accumulation when you need the list:

```tsx
const feed = ws.useStream("events", {}, { reduce: "append", max: 200 });
// feed.data: Item[]
```

## Binding cursors (and any custom store)

[`@ws-asyncapi/cursors`](/guides/presence-cursors) exposes a `Subscribable` store.
Bind it with the generic `useStore` / `fromStore` — no cursor-specific hook needed,
keeping the bindings opinion-free:

```tsx
import { useStore } from "@ws-asyncapi/react";
import { cursorsStore } from "@ws-asyncapi/cursors";
import { useMemo } from "react";

function Cursors() {
    const cursors = useStore(useMemo(() => cursorsStore(ws.client), []));
    return (
        <>
            {[...cursors].map(([id, { x, y }]) => (
                <Cursor key={id} x={x} y={y} />
            ))}
        </>
    );
}
```

`ws.client` is the underlying, precisely-typed client — the escape hatch for
anything the hooks don't wrap (`opened`, raw `request`, `presence.update`, …).

## Other frameworks

Both bindings are thin wrappers over **`@ws-asyncapi/query-core`** — plain
functions and small `{ subscribe, getSnapshot }` stores, since
[`@tanstack/query-core`](https://tanstack.com/query) powers React, Solid, Vue,
Svelte, and Angular alike. To wire ws-asyncapi into a framework without a binding
yet, map query-core's pieces onto that framework's primitives:

- **Option factories** → its `useQuery`/`useMutation`: `requestQueryOptions`,
  `mutationOptions`, `historyQueryOptions`.
- **Stores** → its external-store hook (`useSyncExternalStore`, Solid's `from`, …):
  `presenceStore`, `streamStore`, `lastEventStore`, `connectionStore`.
- **Live cache glue**: `subscribeHistoryLive` appends incoming events into a history
  query's cache entry.

`@ws-asyncapi/react` is the reference implementation. You rarely install query-core
directly — reach for it only when writing a new binding.

## Next

- [**Presence & live cursors**](/guides/presence-cursors) — the store these hooks bind.
- [**RPC & acknowledgements**](/guides/rpc) — what `useRequest` / `useMutate` call.
