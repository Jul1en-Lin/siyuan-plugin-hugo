# siyuan-plugin-hugo

> **[English](https://github.com/Jul1en-Lin/siyuan-plugin-hugo/blob/main/README_en.md)** | 中文

将思源笔记中的文档一键导出到本地 Hugo 仓库，并可按需自动执行 Git 推送。

![preview](https://raw.githubusercontent.com/Jul1en-Lin/siyuan-plugin-hugo/main/preview.png)

## 功能特性

- **一键导出思源文档至本地 Hugo** — 将当前文档导出为 `~./content/post/<folder>/index.md`，连同所有引用资源一并同步。
- **资源文件自动同步** — 参考思源导出文档的标准格式，资源文件统一放置到`assets/` 子目录，同时优化 markdown 中的链接路径。
- **TOML Front Matter** — 自动生成 Hugo 兼容的 front matter，包含 `title`、`slug`、`date`、`lastmod`、`draft`、`categories`、`siyuan_id`、`siyuan_path`，后续支持更多front matter。
- **增量更新** — 通过 `siyuan_id` 识别已导出的文章目录，文档改名后不会重复创建新文件夹。
- **版本控制** — 导出后可选择一键执行 Git 操作： `git add`、`git commit`、`git push`，支持 commmit 消息自定义。
- **分类选择** — 导出前弹出分类确认对话框，可从已有分类中勾选，也可手动输入新分类。
- **中英双语** — 插件界面支持中文和英文，跟随思源系统语言或手动切换。

## 安装

### 从集市安装

打开思源笔记**设置 → 集市 → 搜索 "思源 Hugo 同步"**，点击安装。

### 手动安装

1. 从 [Releases](https://github.com/Jul1en-Lin/siyuan-plugin-hugo/releases) 页面下载 `package.zip`。
2. 解压到 `{思源工作空间}/data/plugins/siyuan-plugin-hugo/`，解压目录文件名需指定 `siyuan-plugin-hugo`
3. 重启思源笔记或重新加载插件。

思源工作空间可在客户端设置中查看，如图
<img width="920" height="342" alt="image" src="https://github.com/user-attachments/assets/27862d7a-03b8-4174-a5b8-d45eaa5ae270" />


## 配置

解压后重启思源笔记，即可在已下载的插件中显示，进入配置页面按需选择，首次配置需要添加 Hugo 仓库路径。

<img width="1448" height="1179" alt="image" src="https://github.com/user-attachments/assets/37e67a8a-70d2-45fc-83a4-fafc2af667cf" />



## 使用方式

- **顶栏按钮** — 点击右上角工具栏的上传图标，选择「导出当前文档到 Hugo」或「导出当前文档并推送」。

若右上角无显示图标可在插件管理中讲图标钉住。
<img width="613" height="126" alt="image" src="https://github.com/user-attachments/assets/3da50d63-eb1b-4ac3-954e-e7ed4ef7c662" />
---
<img width="434" height="247" alt="image" src="https://github.com/user-attachments/assets/97fe9c66-985d-4062-8af4-c511524663e8" />


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

[MIT](https://github.com/Jul1en-Lin/siyuan-plugin-hugo/blob/main/LICENSE)
