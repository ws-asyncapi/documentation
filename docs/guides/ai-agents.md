---
title: AI agents & LLMs
head:
    - - meta
      - name: description
        content: ws-asyncapi is built for AI-assisted development — a contract-first design LLMs can read, an installable agent Skill, llms.txt, and copy-as-markdown on every page. Wire up Claude, Cursor, and Copilot.
---

# AI agents & LLMs

ws-asyncapi is designed to be **legible to language models**. The whole framework
is contract-first: one `Channel` declaration is the source of truth for events,
commands, RPC, streams, presence, history, and auth — and that same value drives
the client's types and a machine-readable AsyncAPI 3.0 document. A model that reads
your channel knows your entire wire protocol, and the TypeScript compiler gives it
immediate, precise feedback when it writes against that contract.

This page covers the three things this project ships for AI-assisted workflows:

1. An installable **agent Skill** that teaches a coding agent the framework.
2. **`llms.txt`** — these docs, packaged for model context.
3. **Copy / download as Markdown** on every page.

## Why ws-asyncapi is AI-friendly

- **The contract is the spec.** A `Channel` is a single, compact declaration. Hand
  it (or its emitted AsyncAPI document) to a model and it has the complete protocol
  — no scattered string event names to guess at.
- **End-to-end types are a feedback loop.** `createClient<typeof channel>()` infers
  the entire client surface with no codegen. When an agent calls `client.request`
  with the wrong shape, `tsc` rejects it — the model self-corrects instead of
  shipping a runtime bug.
- **AsyncAPI is machine-readable.** `getAsyncApiDocument([channel])` emits standard
  AsyncAPI 3.0 JSON, which agents and other tools can consume directly. See
  [Channels & the contract](/guides/channels-contract#asyncapi-cli-codegen).

## The agent Skill

The docs repo ships an [Agent Skill](https://agentskills.io) named **`ws-asyncapi`**
that teaches a coding agent (Claude Code, and any tool that supports the open Skills
format) how to *build apps with* the framework — not how to use the docs site. It
activates automatically when the agent sees `ws-asyncapi`/`@ws-asyncapi/*` imports
or APIs like `new Channel(`, `createClient(`, `createNodeWsServer(`, and routes the
agent to focused references before it writes code:

| Reference | Covers |
| --- | --- |
| `channels` | The full builder — events, commands, rpc, serverRpc, streams, path params, validators, `derive`/`resolve` context, lifecycle, broadcast |
| `client` | `createClient`, `request`/`safeRequest`, typed errors, streams, reconnection/heartbeat/recovery, idempotency |
| `adapters-scaling` | Node & Elysia adapters, the backplane interface, Redis scaling, msgpack codec, the external emitter |
| `presence-cursors` | Typed presence, volatile updates, per-room history, live cursors |
| `auth` | `.onAuth` + `client.authenticate` token refresh, auth in `derive`/`resolve` |
| `react-solid` | `@ws-asyncapi/react` hooks and `@ws-asyncapi/solid` primitives over TanStack Query |
| `codegen` | The AsyncAPI 3.0 document and the CLI-generated client |

### Install it

With the [Skills CLI](https://skills.sh) (installs into `~/.claude/skills`):

```bash
npx skills add ws-asyncapi/documentation@ws-asyncapi -g
```

Or install manually — copy the skill folder into your skills directory
(`~/.claude/skills/` for personal use, or `.claude/skills/` committed to your repo):

```bash
git clone https://github.com/ws-asyncapi/documentation
cp -r documentation/skills/ws-asyncapi ~/.claude/skills/ws-asyncapi
```

The skill lives at
[`skills/ws-asyncapi/`](https://github.com/ws-asyncapi/documentation/tree/main/skills/ws-asyncapi)
in the docs repo. Once installed, restart your agent and it will pick the skill up
on the next ws-asyncapi task.

## llms.txt

These docs are published in the [llms.txt](https://llmstxt.org) format, so you can
drop the whole reference into any model's context window:

- **<https://ws-asyncapi.github.io/documentation/llms.txt>** — a structured index
  of every page with links and summaries (small; good for navigation).
- **<https://ws-asyncapi.github.io/documentation/llms-full.txt>** — the full docs
  concatenated into one Markdown file (large; good for "answer only from these
  docs" prompts).

Paste a URL into a chat, attach the file as context, or fetch it in a tool:

```bash
curl https://ws-asyncapi.github.io/documentation/llms-full.txt -o ws-asyncapi-docs.md
```

## Copy & download as Markdown

Every page on this site has **Copy** and **Download as Markdown** buttons at the
top. Use them to grab a single page as clean Markdown — ideal for pasting the exact
guide you need (e.g. [RPC & acknowledgements](/guides/rpc)) into a model rather than
the whole corpus.

## Wiring up your tools

- **Claude Code** — install the Skill (above); it activates automatically. You can
  also point it at a page's Markdown or the `llms.txt` URL for one-off questions.
- **Cursor** — add the docs as a custom doc source (`@Docs` → add
  `https://ws-asyncapi.github.io/documentation/`), then reference `@ws-asyncapi` in
  prompts. For deep context, attach `llms-full.txt`.
- **GitHub Copilot / others** — attach `llms-full.txt` (or a per-page Markdown copy)
  as context, or keep the Skill folder in your repo under `.claude/skills/` so it
  travels with the project.

## A good agent workflow

Let the contract drive the agent:

1. **Write the `Channel` first** (or have the agent draft it). It's small, it's the
   spec, and it's the one thing reviewers should scrutinize.
2. **Let types do the enforcement.** Ask the agent to build the server handlers and
   the `createClient<typeof channel>()` client against that channel and run `tsc` —
   mismatches surface immediately, no runtime guessing.
3. **Hand over the AsyncAPI document** (`getAsyncApiDocument([channel])`) when the
   client lives in a separate repo or stack — it's the language-agnostic contract,
   and the [CLI](/guides/channels-contract#asyncapi-cli-codegen) regenerates a typed
   client from it.

## Next

- [**Channels & the contract**](/guides/channels-contract)
- [**RPC & acknowledgements**](/guides/rpc)
- [**Get started**](/get-started)
