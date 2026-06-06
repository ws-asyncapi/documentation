---
title: Authentication
head:
    - - meta
      - name: description
        content: Authenticate ws-asyncapi connections — connect-time auth via query/headers and derive/resolve, per-message guards with beforeMessage, and mid-connection token refresh with .onAuth + client.authenticate.
---

# Authentication

Auth in ws-asyncapi rides on the same typed context pipeline as everything else.
There are two moments: **connect time** (who is this?) and **mid-connection**
(refresh a token without dropping the socket).

## Connect-time auth

Read the upgrade request's `query`/`headers` in `.derive` (sync) or `.resolve`
(async) and merge the identity into context. Throwing rejects the connection.

```ts
import { Channel, RpcError } from "ws-asyncapi";
import { z } from "zod";

export const app = new Channel("/app", "app")
    .resolve(async ({ request }) => {
        const user = await verifyJwt(request.query.token);
        if (!user) throw new RpcError("UNAUTHENTICATED", "bad token");
        return { user }; // now available to every handler
    })
    .rpc("me", z.object({}), z.object({ id: z.string() }), async ({ user }) => ({
        id: user.id,
    }));
```

The client passes credentials via the `query` option:

```ts
createClient<typeof app>("ws://localhost:3000", "/app", { query: { token } });
```

::: tip Browser headers
Browsers can't set WebSocket request headers, so prefer `query` in the browser.
Validate the shape with `.query(schema)` / `.headers(schema)` — any
[Standard Schema](https://standardschema.dev) validator works.
:::

## Per-message guards

`.beforeMessage` runs before every inbound command/RPC — the place for
authorization, rate-limiting, and logging. Throw an `RpcError` to reject; on an RPC
it becomes a typed error reply, on a fire-and-forget command it surfaces via
`.onError`.

```ts
new Channel("/app", "app")
    .resolve(async ({ request }) => ({ user: await getUser(request.query.token) }))
    .beforeMessage(({ data }) => {
        if (!data.user) throw new RpcError("UNAUTHORIZED", "sign in first");
    });
```

## Mid-connection token refresh

A WebSocket outlives its bearer token. `.onAuth` lets a client swap credentials on a
**live** connection — no reconnect — re-running validation and updating context.

```ts
// server
new Channel("/app", "app").onAuth(
    z.object({ token: z.string() }),
    ({ credentials }) => {
        const claims = verifyJwt(credentials.token);
        if (!claims) throw new RpcError("UNAUTHENTICATED", "expired");
        return { userId: claims.sub }; // merged into the LIVE connection context
    },
);
```

```ts
// client — refresh before the old token expires
await client.authenticate({ token: freshToken });
// resolves on accept; throws a typed RpcError on reject
```

Returned fields merge into the live connection context, so all later
command/RPC/stream handlers see the new identity. The last accepted credentials are
re-sent automatically after a reconnect, so the refreshed identity survives drops.

## Authorization & rooms

Rooms are fully server-controlled — a client can't subscribe itself. Per-room
authorization is therefore expressible directly in your handlers: only
`ws.subscribe(topic)` a socket to topics it may access (in `.onOpen`, or after a
successful `.authenticate`). The default rejection code is `UNAUTHENTICATED`; throw
your own `RpcError(code, msg, data)` for typed, declared errors.

## Next

- [**Channels & the contract**](/guides/channels-contract) — `derive`/`resolve`, context
- [**RPC & acknowledgements**](/guides/rpc) — typed errors
- [**Presence & live cursors**](/guides/presence-cursors)
