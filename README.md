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

## Adding pages

Pages live in `docs/`; register them in the sidebar in
`docs/.vitepress/config.ts`.

## Agent skill

`skills/ws-asyncapi/` is an [Agent Skill](https://agentskills.io) for writing app
code _with_ ws-asyncapi. See its `SKILL.md`.
