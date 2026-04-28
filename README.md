# SiYuan Hugo Sync

> **[English](./README_en.md)** | 中文

将思源笔记中的文档一键导出到本地 Hugo 仓库，并可按需自动执行 Git 推送。

![preview](./asset/preview.png)

## 功能特性

- **导出为 Hugo Leaf Bundle** — 将当前文档导出为 `content/<section>/<folder>/index.md`，连同所有引用资源一并同步。
- **资源文件自动同步** — 自动将思源中引用的 `/assets/...` 文件复制到 leaf bundle 的 `assets/` 子目录，并重写 markdown 中的链接路径。
- **TOML Front Matter** — 自动生成 Hugo 兼容的 front matter，包含 `title`、`slug`、`date`、`lastmod`、`draft`、`categories`、`tags`、`siyuan_id`、`siyuan_path`。
- **增量更新** — 通过 `siyuan_id` 识别已导出的文章目录，文档改名后不会重复创建新文件夹。
- **Git 工作流** — 导出后可选择自动执行 `git add`、`git commit`、`git push`。
- **分类选择** — 导出前弹出分类确认对话框，可从已有分类中勾选，也可手动输入新分类。
- **单文档属性覆盖** — 通过在文档根块上设置自定义属性，对单篇文章做独立控制。
- **中英双语** — 插件界面支持中文和英文，跟随思源系统语言或手动切换。

## 安装

### 方式一：集市安装

在思源笔记中打开 **设置 → 集市 → 搜索「SiYuan Hugo Sync」**，点击安装即可。

### 方式二：手动安装

1. 从 [Releases](https://github.com/Jul1en-Lin/siyuan-plugin-hugo/releases) 页面下载 `package.zip`。
2. 解压到 `{思源工作空间}/data/plugins/siyuan-plugin-hugo/`。
3. 重启思源笔记或重新加载插件。

## 配置

打开 **设置 → 集市 → 已安装 → 思源 Hugo 同步**，配置以下选项：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| 语言 | 插件界面语言，留空跟随思源系统语言 | *(空)* |
| Hugo 仓库路径 | 本地 Hugo 仓库根目录的绝对路径 | *(空)* |
| 内容目录 | Hugo 仓库内的相对内容目录 | `content/post` |
| 默认分类 | 可选，写入 front matter 的分类 | *(空)* |
| 提交信息模板 | 支持 `{title}` 和 `{docId}` 占位符 | `docs(hugo): sync {title}` |
| 默认标记为草稿 | 导出时默认将文章标记为 draft | `false` |
| 导出后自动推送 | 导出后自动执行 git add/commit/push | `false` |
| 导出前确认分类 | 导出前弹出分类确认对话框 | `true` |

## 单文档属性覆盖

在文档的根块上设置以下自定义属性，可覆盖全局默认值：

| 属性 | 说明 |
|------|------|
| `custom-hugo-slug` | 自定义 URL 别名 |
| `custom-hugo-section` | 覆盖内容目录（如 `blog`） |
| `custom-hugo-draft` | 覆盖草稿状态（`true` / `false`） |

## 使用方式

- **顶栏按钮** — 点击右上角工具栏的上传图标，选择「导出当前文档到 Hugo」或「导出当前文档并推送」。
- **命令面板** — 使用 `Ctrl+P` 打开命令面板，搜索「导出当前文档到 Hugo」或「导出当前文档并推送」。

## Front Matter 示例

导出后生成的 `index.md` 头部如下：

```toml
+++
title = "我的第一篇博客"
slug = "my-first-post"
date = 2025-01-15T10:30:00+08:00
lastmod = 2025-01-15T12:00:00+08:00
draft = false
categories = ["技术"]
tags = ["hugo", "思源笔记"]
siyuan_id = "20250115103000-abcdefg"
siyuan_path = "20250115103000-abcdefg/20250115103000-hijklmn"
+++
```

## 开发

```bash
# 安装依赖
pnpm install

# 创建思源开发链接（将 dev 目录链接到思源插件目录）
pnpm run make-link

# 启动监听构建
pnpm run dev

# 构建生产版本
pnpm run build
```

## 许可证

[MIT](./LICENSE)
