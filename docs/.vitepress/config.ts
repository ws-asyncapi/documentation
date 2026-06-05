import { transformerTwoslash } from "@shikijs/vitepress-twoslash";
import { createFileSystemTypesCache } from "@shikijs/vitepress-twoslash/cache-fs";
import { defineConfig } from "vitepress";
import {
	groupIconMdPlugin,
	groupIconVitePlugin,
} from "vitepress-plugin-group-icons";
import llms, { copyOrDownloadAsMarkdownButtons } from "vitepress-plugin-llms";
import { packageManagersMarkdownPlugin } from "vitepress-plugin-package-managers";

// Public site origin — used for the sitemap, canonical links, OG tags, and
// llms.txt. PLACEHOLDER: set the real domain via `SITE_URL` (or edit here) before
// deploying. There is no confirmed ws-asyncapi domain yet.
const SITE = process.env.SITE_URL ?? "https://example.invalid";

// TypeDoc-generated API sidebar — present only after `bun run gen:typedoc`.
// typedoc-vitepress-theme writes an array (one entry per package module); we wrap
// it under the "/api/" key so VitePress uses it as the API-section sidebar.
let typeDocSidebar: Record<string, unknown[]> = {};
try {
	const { default: items } = await import(
		// @ts-ignore — generated file, not always present
		"../api/typedoc-sidebar.json",
		{ with: { type: "json" } }
	);
	if (Array.isArray(items) && items.length > 0) {
		typeDocSidebar = {
			"/api/": [{ text: "API Reference", link: "/api/", items }],
		};
	}
} catch {
	// not generated yet — fall back to the static API sidebar below
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: "ws-asyncapi",
	description:
		"Contract-first WebSockets for TypeScript — end-to-end typed events, RPC, streams, presence, and live cursors. Socket.IO's runtime with tRPC-grade types.",
	lang: "en-US",
	cleanUrls: true,
	lastUpdated: true,
	base: process.env.BASE_URL ?? "/",

	// API pages are code-generated; their cross-links may not exist before gen.
	ignoreDeadLinks: [
		/^\/api\//,
		(link: string) => link.startsWith("../") || link.includes("%5B"),
	],

	head: [
		["link", { rel: "icon", href: "/favicon.ico", type: "image/x-icon" }],
		["meta", { name: "theme-color", content: "#2563eb" }],
		["meta", { property: "og:type", content: "website" }],
		["meta", { property: "og:locale", content: "en" }],
		["meta", { property: "og:site_name", content: "ws-asyncapi" }],
		["meta", { property: "og:url", content: `${SITE}/` }],
		[
			"meta",
			{
				property: "og:title",
				content: "ws-asyncapi | Contract-first WebSockets for TypeScript",
			},
		],
		[
			"meta",
			{
				property: "og:description",
				content:
					"End-to-end typed events, RPC, streams, presence, and live cursors over WebSockets — from a single contract.",
			},
		],
	],

	sitemap: { hostname: SITE },

	transformHead: ({ pageData: { relativePath } }) => {
		const canonical = `${SITE}/${relativePath}`
			.replace(/index\.md$/, "")
			.replace(/\.md$/, "");
		return [["link", { rel: "canonical", href: canonical }]];
	},

	vite: {
		plugins: [
			groupIconVitePlugin(),
			llms({
				domain: SITE,
				description:
					"ws-asyncapi — contract-first, end-to-end typed WebSockets for TypeScript: events, RPC (acks), streams, presence, history, and live cursors, with React/Solid bindings.",
				ignoreFiles: [],
				experimental: { depth: 3 },
			}),
		],
	},

	markdown: {
		codeTransformers: [
			// @ts-ignore — runtime-compatible transformer options
			transformerTwoslash({
				typesCache: createFileSystemTypesCache({
					dir: "docs/.vitepress/cache/twoslash",
				}),
				// Log Twoslash errors instead of failing the build.
				throws: false,
			}),
		],
		config: (md) => {
			md.use(groupIconMdPlugin);
			md.use(copyOrDownloadAsMarkdownButtons);
			md.use(packageManagersMarkdownPlugin);
		},
	},

	themeConfig: {
		// https://vitepress.dev/reference/default-theme-config
		search: { provider: "local" },
		outline: "deep",
		externalLinkIcon: true,
		editLink: {
			pattern:
				"https://github.com/ws-asyncapi/documentation/edit/main/docs/:path",
			text: "Edit this page on GitHub",
		},
		footer: {
			message: "Released under the MIT License.",
			copyright: "Copyright © 2026 ws-asyncapi contributors",
		},
		socialLinks: [
			{ icon: "github", link: "https://github.com/ws-asyncapi" },
		],
		nav: [
			{ text: "Guide", link: "/introduction" },
			{ text: "Get started", link: "/get-started" },
			{ text: "API", link: "/api/" },
		],
		sidebar: {
			...typeDocSidebar,
			"/api/": [
				{
					text: "API Reference",
					link: "/api/",
					items: [
						{ text: "ws-asyncapi (core)", link: "/api/" },
					],
				},
			],
			"/": [
				{
					text: "Introduction",
					items: [
						{ text: "Why ws-asyncapi", link: "/introduction" },
						{ text: "Get started", link: "/get-started" },
					],
				},
				{
					text: "Guides",
					items: [
						{ text: "Channels & the contract", link: "/guides/channels-contract" },
						{ text: "RPC & acknowledgements", link: "/guides/rpc" },
						{ text: "Presence & live cursors", link: "/guides/presence-cursors" },
						{ text: "React & Solid bindings", link: "/guides/react-solid" },
					],
				},
			],
		},
	},
});
