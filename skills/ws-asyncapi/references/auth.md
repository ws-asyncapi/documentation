---
name: auth
description: Connection auth and mid-connection token refresh — .onAuth + client.authenticate, auth via derive/resolve and query/headers, and rejecting with typed errors.
---

# Auth

## Connect-time auth (`derive` / `resolve`)

Authenticate on connect by reading the upgrade `query`/`headers` in `derive` (sync)
or `resolve` (async), and merge the identity into context:

```ts
new Channel("/app", "app")
    .resolve(async ({ request }) => {
        const user = await verifyJwt(request.query.token);
        if (!user) throw new RpcError("UNAUTHENTICATED", "bad token");
        return { user }; // available to all handlers
    })
    .rpc("me", z.object({}), z.object({ id: z.string() }),
        async ({ user }) => ({ id: user.id }));
```

Throwing in `resolve`/`derive` surfaces to RPC callers as an error. The client
passes credentials via the `query` option:

```ts
createClient<typeof app>("ws://localhost:3000", "/app", { query: { token } });
```

> Browsers cannot set WebSocket request headers, so prefer `query` for the
> browser; `headers` is for SSR/parity.

## Mid-connection token refresh (`.onAuth` + `client.authenticate`)

A WebSocket outlives its bearer token. `.onAuth` lets a client swap credentials on
a **live** connection — no reconnect — re-running validation and updating context.

```ts
// server
new Channel("/app", "app").onAuth(
    z.object({ token: z.string() }),
    ({ credentials, ws, request, data }) => {
        const claims = verifyJwt(credentials.token); // throw RpcError to reject
        if (!claims) throw new RpcError("UNAUTHENTICATED", "expired");
        return { userId: claims.sub }; // merged into the LIVE connection context
    },
);
```

```ts
// client — refresh before the old token expires
await client.authenticate({ token: freshToken }); // resolves on accept, throws typed RpcError on reject
```

Returned fields are merged into the live `conn.data` (all later command/rpc/stream
handlers see the new identity). The last credentials are re-sent automatically
after a reconnect, so the refreshed identity survives drops.

## Notes

- Default rejection code is `UNAUTHENTICATED`; throw your own `RpcError(code, msg, data)`
  for typed, declared errors.
- Per-room authorization is expressible directly in handlers (rooms are
  server-controlled — only subscribe a socket to topics it may access in `.onOpen`
  or after a successful `.authenticate`).
