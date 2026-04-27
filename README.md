# SiYuan Hugo Sync / 思源 Hugo 同步

[English](#english) | [中文](#中文)

---

<a id="english"></a>
## English

A SiYuan plugin that exports the current document to a local Hugo repository, optionally running `git add`, `git commit`, and `git push` for the exported content.

### Features

- **Export as Hugo Leaf Bundle** — Exports the current document to `content/<section>/<folder>/index.md` along with its assets.
- **Asset Syncing** — Automatically copies referenced SiYuan `/assets/...` files into the leaf bundle and rewrites links.
- **TOML Front Matter** — Generates Hugo-compatible front matter including `title`, `slug`, `date`, `lastmod`, `draft`, `categories`, `tags`, `siyuan_id`, and `siyuan_path`.
- **Incremental Updates** — Reuses the same Hugo folder on later exports by matching `siyuan_id`.
- **Git Workflow** — Optional automatic `git add`, `commit`, and `push` after export.
- **Per-Document Overrides** — Customize individual documents via custom attributes.
- **Desktop Only** — Requires SiYuan desktop with Node.js runtime access.

### Installation

#### Manual Install

1. Download `package.zip` from the [Releases](../../releases) page.
2. Extract it to `{SiYuan workspace}/data/plugins/siyuan-plugin-hugo/`.
3. Restart SiYuan or reload plugins.

### Configuration

Open **Settings → Marketplace → Plugins → SiYuan Hugo Sync** and configure:

| Setting | Description | Default |
|---------|-------------|---------|
| **Hugo repository path** | Absolute path to your local Hugo repo root. | *(empty)* |
| **Content directory** | Relative path inside the Hugo repo. | `content/post` |
| **Default category** | Optional category written to front matter. | *(empty)* |
| **Commit message template** | Supports `{title}` and `{docId}` placeholders. | `docs(hugo): sync {title}` |
| **Draft by default** | Exported posts are marked as draft. | `false` |
| **Auto push after export** | Run git add/commit/push on every export. | `false` |

### Per-Document Overrides

Set these custom attributes on the document root block to override defaults:

- `custom-hugo-slug` — Custom URL slug.
- `custom-hugo-section` — Override the content section (e.g., `blog`).
- `custom-hugo-draft` — Override draft status (`true` / `false`).

### Usage

- **Top Bar** — Click the upload icon in the top-right toolbar.
- **Command Palette** — Use `Export current document to Hugo` or `Export current document and push`.

### Development

1. Install dependencies: `pnpm install`
2. Create the SiYuan dev link: `pnpm run make-link`
3. Start watch build: `pnpm run dev`
4. Build package: `pnpm run build`

---

<a id="中文"></a>
## 中文

思源笔记插件，将当前文档导出到本地 Hugo 仓库，并可选择自动执行 `git add`、`git commit` 和 `git push`。

### 功能特性

- **导出为 Hugo Leaf Bundle** — 将当前文档导出为 `content/<section>/<folder>/index.md`，并同步相关资源文件。
- **资源文件同步** — 自动将思源笔记中引用的 `/assets/...` 文件复制到 leaf bundle 中，并重写链接路径。
- **TOML Front Matter** — 自动生成兼容 Hugo 的 front matter，包含 `title`、`slug`、`date`、`lastmod`、`draft`、`categories`、`tags`、`siyuan_id`、`siyuan_path`。
- **增量更新** — 通过匹配 `siyuan_id`，后续导出会复用同一个 Hugo 文件夹，避免重复创建。
- **Git 工作流** — 导出后可选择自动执行 `git add`、`commit` 和 `push`。
- **单文档覆盖** — 通过自定义属性为单个文档设置独立配置。
- **仅桌面端** — 需要思源笔记桌面版，且具备 Node.js 运行环境。

### 安装方式

#### 手动安装

1. 从 [Releases](../../releases) 页面下载 `package.zip`。
2. 解压到 `{思源工作空间}/data/plugins/siyuan-plugin-hugo/`。
3. 重启思源笔记或重新加载插件。

### 必要配置

打开 **设置 → 集市 → 插件 → 思源 Hugo 同步**，配置以下选项：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| **Hugo 仓库路径** | 本地 Hugo 仓库根目录的绝对路径。 | *(空)* |
| **内容目录** | Hugo 仓库内的相对内容目录。 | `content/post` |
| **默认分类** | 可选，写入 front matter 的分类。 | *(空)* |
| **提交信息模板** | 支持 `{title}` 和 `{docId}` 占位符。 | `docs(hugo): sync {title}` |
| **默认标记为草稿** | 导出时默认将文章标记为 draft。 | `false` |
| **导出后自动推送** | 普通导出也执行 git add/commit/push。 | `false` |

### 单文档属性覆盖

在文档的根块上设置以下自定义属性，可覆盖全局默认值：

- `custom-hugo-slug` — 自定义 URL 别名。
- `custom-hugo-section` — 覆盖内容目录（如 `blog`）。
- `custom-hugo-draft` — 覆盖草稿状态（`true` / `false`）。

### 使用方式

- **顶栏按钮** — 点击右上角工具栏的上传图标。
- **命令面板** — 使用「导出当前文档到 Hugo」或「导出当前文档并推送」。

### 开发

1. 安装依赖：`pnpm install`
2. 创建思源开发链接：`pnpm run make-link`
3. 启动监听构建：`pnpm run dev`
4. 构建打包：`pnpm run build`
