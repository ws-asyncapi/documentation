/**
 * Generate the TypeDoc API reference into `docs/api/` (Markdown, VitePress theme).
 *
 * Reads the published `@ws-asyncapi/*` packages from `node_modules` (their bundled
 * `dist/index.d.ts`) — so it runs self-contained in CI after `bun install`, no
 * sibling source checkouts needed.
 *
 * Each package's bundled `index.d.ts` is first staged into `.api-entries/<name>/`
 * so TypeDoc derives a clean module name (`core`, `client`, …) instead of the raw
 * `node_modules/@ws-asyncapi/<pkg>/dist` path — the `@`/`dist` form produces module
 * routes VitePress treats as dead links (the `@` segment collides with Vite's alias).
 * The staged single-file `.d.ts` keeps its bare imports (`from "ws-asyncapi"`),
 * which still resolve against `node_modules`.
 *
 * If TypeDoc fails, we log and exit 0 so `vitepress build` still runs —
 * `config.ts` falls back to the static API sidebar when `docs/api/` is absent.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { Application } from "typedoc";

// [npm package, clean module name]
const PACKAGES: [string, string][] = [
	["ws-asyncapi", "core"],
	["@ws-asyncapi/client", "client"],
	["@ws-asyncapi/query-core", "query-core"],
	["@ws-asyncapi/react", "react"],
	["@ws-asyncapi/solid", "solid"],
	["@ws-asyncapi/cursors", "cursors"],
	["@ws-asyncapi/emitter", "emitter"],
	["@ws-asyncapi/testing", "testing"],
];

const STAGE = ".api-entries";

function stageEntries(): string[] {
	rmSync(STAGE, { recursive: true, force: true });
	const entries: string[] = [];
	for (const [pkg, name] of PACKAGES) {
		const src = `node_modules/${pkg}/dist/index.d.ts`;
		if (!existsSync(src)) {
			console.warn(`[gen:typedoc] missing ${src} — skipping ${pkg}`);
			continue;
		}
		const dest = `${STAGE}/${name}/index.d.ts`;
		mkdirSync(dirname(dest), { recursive: true });
		cpSync(src, dest);
		entries.push(dest);
	}
	return entries;
}

async function main() {
	const entryPoints = stageEntries();
	const app = await Application.bootstrapWithPlugins({
		options: "./typedoc.json",
		entryPoints,
	});

	const project = await app.convert();
	if (!project) {
		console.warn("[gen:typedoc] convert() produced no project — skipping.");
		return;
	}

	await app.generateOutputs(project);
	console.log("[gen:typedoc] wrote API reference to docs/api/");
}

main()
	.catch((error) => {
		console.warn(
			"[gen:typedoc] skipped — TypeDoc failed (are the packages installed?):\n",
			error instanceof Error ? error.message : error,
		);
	})
	// Always succeed: a missing/partial API reference must never break the docs
	// build — `config.ts` falls back to the static API sidebar.
	.finally(() => {
		rmSync(STAGE, { recursive: true, force: true });
		process.exit(0);
	});
