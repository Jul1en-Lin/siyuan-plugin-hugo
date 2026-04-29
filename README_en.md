# SiYuan Hugo Sync

> English | **[中文](./README.md)**

A SiYuan plugin that exports the current document to a local Hugo repository, with optional automatic Git push.

![preview](https://raw.githubusercontent.com/Jul1en-Lin/siyuan-plugin-hugo/main/preview.png)

## Features

- **Export as Hugo Leaf Bundle** — Exports the current document to `content/<section>/<folder>/index.md` along with all referenced assets.
- **Asset Syncing** — Automatically copies referenced SiYuan `/assets/...` files into the leaf bundle's `assets/` subdirectory and rewrites markdown links.
- **TOML Front Matter** — Generates Hugo-compatible front matter including `title`, `slug`, `date`, `lastmod`, `draft`, `categories`, `tags`, `siyuan_id`, and `siyuan_path`.
- **Incremental Updates** — Reuses the same Hugo folder on later exports by matching `siyuan_id`, avoiding duplicate directories when documents are renamed.
- **Git Workflow** — Optional automatic `git add`, `git commit`, and `git push` after export.
- **Category Selection** — A confirmation dialog before export lets you pick from existing categories or type new ones.
- **Per-Document Overrides** — Customize individual documents via custom attributes on the root block.
- **Bilingual UI** — Plugin interface supports Chinese and English, following the SiYuan system language or manual selection.

## Installation

### From Marketplace

Open **Settings → Marketplace → Search "SiYuan Hugo Sync"** in SiYuan and click Install.

### Manual Install

1. Download `package.zip` from the [Releases](https://github.com/Jul1en-Lin/siyuan-plugin-hugo/releases) page.
2. Extract it to `{SiYuan workspace}/data/plugins/siyuan-plugin-hugo/`.
3. Restart SiYuan or reload plugins.

## Configuration

Open **Settings → Marketplace → Installed → SiYuan Hugo Sync** and configure:

| Setting | Description | Default |
|---------|-------------|---------|
| Language | Plugin UI language, leave empty to follow SiYuan system language | *(empty)* |
| Hugo repository path | Absolute path to your local Hugo repo root | *(empty)* |
| Content directory | Relative path inside the Hugo repo | `content/post` |
| Default category | Optional category written to front matter | *(empty)* |
| Commit message template | Supports `{title}` and `{docId}` placeholders | `docs(hugo): sync {title}` |
| Draft by default | Mark exported posts as draft | `false` |
| Auto push after export | Run git add/commit/push on every export | `false` |
| Confirm category before export | Show category confirmation dialog before exporting | `true` |

## Per-Document Overrides

Set these custom attributes on the document root block to override defaults:

| Attribute | Description |
|-----------|-------------|
| `custom-hugo-slug` | Custom URL slug |
| `custom-hugo-section` | Override the content section (e.g., `blog`) |
| `custom-hugo-draft` | Override draft status (`true` / `false`) |

## Usage

- **Top Bar** — Click the upload icon in the top-right toolbar, then choose "Export current document to Hugo" or "Export current document and push".
- **Command Palette** — Press `Ctrl+P` and search for "Export current document to Hugo" or "Export current document and push".

## Front Matter Example

The exported `index.md` will have a header like this:

```toml
+++
title = "My First Blog Post"
slug = "my-first-post"
date = 2025-01-15T10:30:00+08:00
lastmod = 2025-01-15T12:00:00+08:00
draft = false
categories = ["Tech"]
tags = ["hugo", "siyuan"]
siyuan_id = "20250115103000-abcdefg"
siyuan_path = "20250115103000-abcdefg/20250115103000-hijklmn"
+++
```

## Development

```bash
# Install dependencies
pnpm install

# Create the SiYuan dev link (symlinks dev dir to SiYuan plugins dir)
pnpm run make-link

# Start watch build
pnpm run dev

# Build production package
pnpm run build
```

## License

[MIT](./LICENSE)
