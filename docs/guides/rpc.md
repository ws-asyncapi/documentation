---
title: RPC & acknowledgements
head:
    - - meta
      - name: description
        content: Typed request/response over WebSockets with ws-asyncapi — request and safeRequest, discriminated typed errors, timeouts, idempotency keys, and server-to-client RPC.
---

# RPC & acknowledgements

An **RPC** is a client → server call that returns a typed reply — the
acknowledgement Socket.IO makes you wire up by hand, but fully typed. Declare it
with `.rpc(name, inputSchema, outputSchema, handler, errors?)`.

```ts
// server.ts
import { Channel, RpcError } from "ws-asyncapi";
import { z } from "zod";

export const api = new Channel("/api", "api").rpc(
    "transfer",
    z.object({ to: z.string(), amount: z.number().positive() }),
    z.object({ balance: z.number() }),
    async ({ message }) => {
        if (message.amount > balanceOf("me"))
            throw new RpcError("INSUFFICIENT_FUNDS", "not enough", {
                short: message.amount - balanceOf("me"),
            });
        return { balance: debit("me", message.amount) };
    },
    // declared, recoverable error codes → typed `data` per code
    { INSUFFICIENT_FUNDS: z.object({ short: z.number() }) },
);
```

## Calling it

```ts
const client = createClient<typeof api>("ws://localhost:3000", "/api");

const { balance } = await client.request("transfer", { to: "bob", amount: 10 });
//      ^ number — inferred from the output schema
```

`request` resolves with the typed output or **throws** on failure. The input is
validated on the server before the handler runs (a failure throws a `VALIDATION`
error).

## Handling errors without try/catch — `safeRequest`

`safeRequest` returns a discriminated result you narrow on `error`, so typed error
`data` is reachable without exceptions:

```ts
const res = await client.safeRequest("transfer", { to: "bob", amount: 999 });

if (res.error) {
    if (res.error.code === "INSUFFICIENT_FUNDS") {
        // res.error.data: { short: number }  ← narrowed by the code
        toast(`You're short ${res.error.data.short}`);
    }
} else {
    // res.data: { balance: number }
    console.log(res.data.balance);
}
```

Every result also carries the built-in runtime codes — `VALIDATION`, `NOT_FOUND`,
`INTERNAL`, `TIMEOUT`, `OVERLOADED` — with `data: unknown`.

## Timeouts

Calls reject with a `TIMEOUT` error (synthesized client-side) if no reply arrives
in time. The default is 30s; override per call:

```ts
await client.request("transfer", input, { timeout: 5_000 });
```

## Idempotency

Pass a stable `idempotencyKey` so a retried call (e.g. after a reconnect) runs the
handler **once** and replays the cached result to duplicates — side effects don't
happen twice.

```ts
await client.request("transfer", input, {
    idempotencyKey: `transfer:${operationId}`,
});
```

Generate one key per logical action and reuse it across retries.

## Errors from the context pipeline

Errors thrown in `.derive()` / `.resolve()` (for example, failed auth) surface to
the caller as RPC errors too. Throw an `RpcError` with a declared code to give
callers typed `data`; throw anything else and the caller sees `INTERNAL`.

## Server → client RPC

Sometimes the **server** needs to ask the **client** a question and await a typed
reply — declare it with `.serverRpc(name, input, output)`:

```ts
// contract
new Channel("/agent", "agent").serverRpc(
    "whoAreYou",
    z.object({}),
    z.object({ name: z.string() }),
);
```

```ts
// client answers
client.onRequest("whoAreYou", async () => ({ name: "Alice" }));
```

The server calls it through its socket handle and awaits the typed `{ name }`.

## Next

- [**Channels & the contract**](/guides/channels-contract) — the full builder surface.
- [**Presence & live cursors**](/guides/presence-cursors) — live multiplayer state.
- [**React & Solid bindings**](/guides/react-solid) — RPCs as TanStack Query queries/mutations.
