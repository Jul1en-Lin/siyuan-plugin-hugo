# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **SiYuan Note plugin** that exports the current document into a local Hugo static site repository, with optional Git push. It is built on top of [frostime's sy-plugin-template-vite](https://github.com/frostime/sy-plugin-template-vite).

- **Tech stack**: Vite + TypeScript + Svelte
- **Target platform**: SiYuan desktop only (requires Node.js runtime for filesystem and Git operations)
- **Package manager**: pnpm

## Build Commands

```bash
# Install dependencies
pnpm install

# Development: watch build to dev/ directory
pnpm run dev

# Production build to dist/ directory
pnpm run build

# Build and package into package.zip
pnpm run make-install

# Create a symbolic link from dev/ to the SiYuan plugins directory
pnpm run make-link

# Update version across package.json and plugin.json
pnpm run update-version
```

## Architecture

### Entry Point and Plugin Lifecycle

`src/index.ts` defines the `SiyuanHugoPlugin` class extending SiYuan's `Plugin`. It:
- Registers three commands: "Export current document", "Export and push", and "Open settings"
- Adds a top-bar button that opens a menu with the above actions
- Manages settings through `SettingUtils`
- Handles i18n language switching (zh_CN / en_US / auto)

### Core Export Logic

`src/hugo-exporter.ts` contains the entire export pipeline `exportDocumentToHugo()`:
1. Queries the document via SiYuan API (`exportMdContent` with `refMode: 4`, `embedMode: 0`)
2. Reads block attributes for per-document overrides (`custom-hugo-slug`, `custom-hugo-section`, `custom-hugo-draft`)
3. Resolves the target directory inside the Hugo repo, using `siyuan_id` to detect existing exports for incremental updates
4. Extracts asset references from the markdown, downloads them via `getFileBlob`, and writes them to `assets/` under the target directory
5. Rewrites asset links to relative paths and normalizes inline formatting for Hugo's Goldmark parser
6. Generates TOML front matter (`title`, `slug`, `date`, `lastmod`, `draft`, `categories`, `tags`, `siyuan_id`, `siyuan_path`)
7. Writes `index.md`
8. Optionally runs `git add`, `git commit`, and `git push`

### Node Runtime Access

`src/node-runtime.ts` provides a lazy-initialized wrapper around Node.js modules (`fs`, `path`, `child_process`) accessed through the global `require` available in SiYuan's desktop environment. `hasNodeRuntime()` guards all desktop-only features.

### API Layer

`src/api.ts` is a wrapper around SiYuan's HTTP/WebSocket APIs. Key functions used by this plugin:
- `exportMdContent(id, { refMode: 4, embedMode: 0, yfm: false })` — exports document markdown
- `getBlockByID`, `getBlockAttrs` — document metadata
- `getFileBlob` — reads asset files as Blob
- `lsNotebooks` — used to detect the notebook name as default category

### Settings System

`src/settings.ts` defines the `HugoPluginSettings` interface and `DEFAULT_SETTINGS`.

`src/libs/setting-utils.ts` (from the template) renders the settings UI using SiYuan's native CSS classes (`b3-switch`, `b3-text-field`, etc.). Settings are persisted as JSON in SiYuan's data directory via `plugin.loadData` / `plugin.saveData`.

### Internationalization

Translation strings live in `public/i18n/zh_CN.json` and `public/i18n/en_US.json`. `vite.config.ts` copies these into the output directory via `viteStaticCopy`. The plugin loads the appropriate file at runtime and assigns it to `this.i18n`.

## Important Development Notes

- **Desktop-only**: The plugin checks `getFrontend()` and `hasNodeRuntime()`; all export functionality is gated behind these checks.
- **Per-document overrides**: Users can set custom attributes on the document root block:
  - `custom-hugo-slug` — overrides the URL slug
  - `custom-hugo-section` — overrides the content subdirectory
  - `custom-hugo-draft` — overrides the draft flag (`1`/`true`/`yes`/`on`)
- **Version synchronization**: `package.json` and `plugin.json` both contain version fields. Use `pnpm run update-version` or update both manually to keep them in sync.
- **Build outputs**: Development writes to `dev/`; production writes to `dist/` and produces `package.zip` at the repository root.
- **Asset handling**: If `getFileBlob` fails, the exporter falls back to reading directly from SiYuan's data directory via filesystem (`window.siyuan.config.system.dataDir`).
- **Category dialog**: When `confirmCategoryBeforeExport` is enabled, the plugin scans existing `index.md` files in the Hugo content directory to build a list of existing categories before showing the confirmation dialog.
