# 思源 Hugo 同步

这个插件用于把当前打开的思源文档导出到本地 Hugo 仓库，并且可以按需执行 `git add`、`git commit`、`git push`。

## 当前 MVP 能力

- 将当前文档导出为 Hugo leaf bundle：
  - `content/post/<文章目录>/index.md`
  - `content/post/<文章目录>/assets/*`
- 自动复制文档中引用的思源 `/assets/...` 资源
- 自动生成 TOML front matter
- 通过 `siyuan_id` 识别已导出的文章目录，避免文档改名后重复生成新目录
- 可选执行 Git 提交和推送

## 设置项

- `Hugo 仓库路径`：本地 Hugo 仓库根目录的绝对路径
- `内容目录`：Hugo 仓库内的相对内容目录，默认是 `content/post`
- `默认分类`：可选写入 front matter 的分类
- `提交信息模板`：支持 `{title}` 和 `{docId}` 占位符
- `默认标记为草稿`
- `导出后自动推送`

## 文档级覆盖属性

如果你想对单篇文章做单独控制，可以在文档根块上设置这些自定义属性：

- `custom-hugo-slug`
- `custom-hugo-section`
- `custom-hugo-draft`

## 开发

1. 安装依赖：`pnpm install`
2. 创建思源开发链接：`pnpm run make-link`
3. 启动监听构建：`pnpm run dev`
4. 打包插件：`pnpm run build`
