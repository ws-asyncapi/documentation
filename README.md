# ws-asyncapi documentation

The documentation site for [ws-asyncapi](https://github.com/ws-asyncapi), built
with [VitePress](https://vitepress.dev).

## Develop

```bash
bun install
bun run dev          # local dev server with HMR
```

## Build

```bash
bun run build        # gen:typedoc + vitepress build
bun run build:site   # vitepress build only (skip the API reference)
bun run preview      # preview the production build
```

## API reference (TypeDoc)

`bun run gen:typedoc` reads the sibling package sources (`../core`, `../client`,
…) via `tsconfig.typedoc.json` and writes Markdown API pages into `docs/api/`.
It must run from inside the ws-asyncapi workspace (the parent dir provides
`node_modules`). If it fails, the site still builds — the config falls back to a
static API sidebar.

## Shipped skill: `skills/ws-asyncapi/`

`skills/ws-asyncapi/` is the **ws-asyncapi usage skill** — an
[Agent Skill](https://agentskills.io) that teaches an AI agent to write
application code _with_ the framework (channels, adapters, the typed client,
React/Solid bindings, live cursors, scaling, codegen). It's `SKILL.md` + topic
`references/`, following the [Agent Skills spec](https://agentskills.io/specification)
(the skill's directory name matches its `name`). Validate with:

```bash
npx skills-ref validate ./skills/ws-asyncapi
```

Publish it so users can `npx skills add ws-asyncapi/...`.

This is distinct from the two skills used to _author this site_:

- **`vitepress`** (antfu) — VitePress config/theme/markdown mechanics.
- **`documentation-writer`** — Diátaxis-framework technical writing.

## Authoring pages

Pages live in `docs/`. Register a new page in the sidebar in
`docs/.vitepress/config.ts`. Code samples can opt into type-checked
[Twoslash](https://shiki.style/packages/twoslash) with ` ```ts twoslash ` once
the workspace packages are linked as dependencies here.
