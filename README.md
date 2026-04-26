# SiYuan Hugo Sync

SiYuan Hugo Sync exports the current SiYuan document into a local Hugo repository and can optionally run `git add`, `git commit`, and `git push` for that exported content.

## Current MVP

- Export the current document to a Hugo leaf bundle:
  - `content/post/<folder>/index.md`
  - `content/post/<folder>/assets/*`
- Copy referenced SiYuan `/assets/...` files into the leaf bundle
- Write TOML front matter
- Reuse the same Hugo folder on later exports by matching `siyuan_id`
- Optional git push workflow

## Settings

- `Hugo repository path`: absolute path to the local Hugo repo root
- `Content directory`: relative path inside the Hugo repo, default `content/post`
- `Default category`: optional front matter category
- `Commit message template`: supports `{title}` and `{docId}`
- `Draft by default`
- `Auto push after export`

## Per-document overrides

Set these custom attributes on the document root if needed:

- `custom-hugo-slug`
- `custom-hugo-section`
- `custom-hugo-draft`

## Development

1. Install dependencies: `pnpm install`
2. Create the SiYuan development link: `pnpm run make-link`
3. Start watch build: `pnpm run dev`
4. Build package: `pnpm run build`
