/**
 * Generate the TypeDoc API reference into `docs/api/` (Markdown, VitePress theme).
 *
 * Reads the sibling package sources directly via `tsconfig.typedoc.json` paths,
 * so it must run from inside the ws-asyncapi workspace (the parent dir provides
 * `node_modules` for the packages' external deps). If TypeDoc fails (e.g. the
 * workspace isn't installed), we log and exit 0 so `vitepress build` still runs —
 * `config.ts` falls back to the static API sidebar when `docs/api/` is absent.
 */
import { Application } from "typedoc";

async function main() {
	const app = await Application.bootstrapWithPlugins({
		options: "./typedoc.json",
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
			"[gen:typedoc] skipped — TypeDoc failed (is the workspace installed?):\n",
			error instanceof Error ? error.message : error,
		);
	})
	// Always succeed: a missing/partial API reference must never break the docs
	// build — `config.ts` falls back to the static API sidebar.
	.finally(() => process.exit(0));
