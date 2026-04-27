import { exportMdContent, getBlockAttrs, getBlockByID, getFileBlob } from "@/api";
import { getNodeRuntime } from "@/node-runtime";
import { DEFAULT_SETTINGS, DOC_ATTR_KEYS, type HugoPluginSettings } from "@/settings";

const ASSET_DESTINATION_PATTERNS = [
    /!\[[^\]]*]\(([^)]+)\)/g,
    /\[[^\]]*]\(([^)]+)\)/g,
    /(?:src|href)=["']([^"']+)["']/g,
];

export interface ExportResult {
    title: string;
    indexPath: string;
    targetDir: string;
    assetCount: number;
    pushed: boolean;
}

export interface ExportMessages {
    repoPathRequired: string;
    docNotFound: string;
    repoNotExists: string;
    notGitRepo: string;
    assetReadFailed: string;
    stagedCheckFailed: string;
    outsideRepoWrite: string;
    gitCommandFailed: string;
}

export async function exportDocumentToHugo(docId: string, settings: HugoPluginSettings, options?: {
    push?: boolean;
    messages?: Partial<ExportMessages>;
}) {
    const node = getNodeRuntime();
    const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
    const messages = buildExportMessages(options?.messages);
    const repoPath = mergedSettings.hugoRepoPath.trim();
    if (!repoPath) {
        throw new Error(messages.repoPathRequired);
    }

    const docBlock = await getBlockByID(docId);
    if (!docBlock) {
        throw new Error(formatMessage(messages.docNotFound, { docId }));
    }

    const attrs = await getBlockAttrs(docId).catch(() => ({}));
    const exported = await exportMdContent(docId, {
        refMode: 4,
        embedMode: 0,
        yfm: false,
    });

    const resolvedRepoPath = node.path.resolve(repoPath);
    if (!node.fs.existsSync(resolvedRepoPath)) {
        throw new Error(formatMessage(messages.repoNotExists, { path: resolvedRepoPath }));
    }
    if (!node.fs.existsSync(node.path.join(resolvedRepoPath, ".git"))) {
        throw new Error(formatMessage(messages.notGitRepo, { path: resolvedRepoPath }));
    }

    const sectionDir = resolveContentDir(
        mergedSettings.contentBaseDir,
        attrs[DOC_ATTR_KEYS.section],
    );
    const title = cleanTitle(docBlock.content || lastPathSegment(exported.hPath) || docId);
    const targetDir = resolveTargetDir({
        repoPath: resolvedRepoPath,
        sectionDir,
        docId,
        title,
        messages,
    });
    const tags = parseTags(docBlock.tag);
    const draft = parseBooleanAttr(attrs[DOC_ATTR_KEYS.draft], mergedSettings.defaultDraft);
    const slug = sanitizeSlug(attrs[DOC_ATTR_KEYS.slug] || title);
    const createdAt = toIsoDate(docBlock.created) ?? new Date().toISOString();
    const updatedAt = toIsoDate(docBlock.updated) ?? createdAt;

    node.fs.mkdirSync(targetDir, { recursive: true });

    const assetMap = await materializeAssets(exported.content, targetDir, messages);
    const markdown = normalizeMarkdownForHugo(rewriteAssetLinks(exported.content, assetMap));
    const frontMatter = buildTomlFrontMatter({
        title,
        slug,
        draft,
        createdAt,
        updatedAt,
        category: mergedSettings.defaultCategory,
        tags,
        siyuanId: docId,
        siyuanPath: exported.hPath || docBlock.hpath || "",
    });
    const indexPath = node.path.join(targetDir, "index.md");
    node.fs.writeFileSync(indexPath, `${frontMatter}${markdown}`, "utf8");

    const shouldPush = options?.push ?? mergedSettings.autoPushAfterExport;
    const pushed = shouldPush
        ? syncGitRepo({
            repoPath: resolvedRepoPath,
            relativeTargetDir: node.path.relative(resolvedRepoPath, targetDir),
            commitMessage: buildCommitMessage(mergedSettings.commitMessageTemplate, {
                title,
                docId,
            }),
            messages,
        })
        : false;

    return {
        title,
        indexPath,
        targetDir,
        assetCount: assetMap.size,
        pushed,
    } satisfies ExportResult;
}

function resolveContentDir(defaultDir: string, overrideDir?: string): string {
    const raw = (overrideDir || defaultDir || DEFAULT_SETTINGS.contentBaseDir)
        .trim()
        .replace(/^[\\/]+|[\\/]+$/g, "")
        .replace(/[\\]+/g, "/");
    if (!raw) {
        return DEFAULT_SETTINGS.contentBaseDir;
    }
    return raw.startsWith("content/") ? raw : `content/${raw}`;
}

function resolveTargetDir(args: {
    repoPath: string;
    sectionDir: string;
    docId: string;
    title: string;
    messages: ExportMessages;
}) {
    const node = getNodeRuntime();
    const sectionPath = node.path.resolve(args.repoPath, args.sectionDir);
    ensureInsideRepo(args.repoPath, sectionPath, args.messages);
    node.fs.mkdirSync(sectionPath, { recursive: true });

    const existingDir = findExistingDocDir(sectionPath, args.docId);
    if (existingDir) {
        return existingDir;
    }

    const folderName = sanitizeFileName(args.title) || args.docId;
    const targetDir = node.path.resolve(sectionPath, folderName);
    ensureInsideRepo(args.repoPath, targetDir, args.messages);
    return targetDir;
}

function findExistingDocDir(sectionPath: string, docId: string): string | null {
    const node = getNodeRuntime();
    if (!node.fs.existsSync(sectionPath)) {
        return null;
    }

    for (const entry of node.fs.readdirSync(sectionPath, { withFileTypes: true })) {
        if (!entry.isDirectory()) {
            continue;
        }
        const candidate = node.path.join(sectionPath, entry.name, "index.md");
        if (!node.fs.existsSync(candidate)) {
            continue;
        }

        const content = node.fs.readFileSync(candidate, "utf8");
        if (content.includes(`siyuan_id = ${JSON.stringify(docId)}`)) {
            return node.path.dirname(candidate);
        }
    }
    return null;
}

async function materializeAssets(markdown: string, targetDir: string, messages: ExportMessages) {
    const node = getNodeRuntime();
    const assetMap = new Map<string, string>();
    const sourceToRelativeTarget = new Map<string, string>();
    const usedNames = new Set<string>();

    for (const assetRef of extractAssetReferences(markdown)) {
        let relativeTargetPath = sourceToRelativeTarget.get(assetRef.sourcePath);
        if (!relativeTargetPath) {
            const blob = await getFileBlob(assetRef.sourcePath);
            if (!blob) {
                throw new Error(formatMessage(messages.assetReadFailed, { path: assetRef.sourcePath }));
            }

            const assetDir = node.path.join(targetDir, "assets");
            node.fs.mkdirSync(assetDir, { recursive: true });

            const basename = sanitizeFileName(node.path.basename(decodeURIComponent(assetRef.sourcePath)));
            const fileName = createUniqueName(basename || "asset", usedNames);
            const targetPath = node.path.join(assetDir, fileName);
            const buffer = new Uint8Array(await blob.arrayBuffer());
            node.fs.writeFileSync(targetPath, buffer);
            relativeTargetPath = `assets/${fileName}`;
            sourceToRelativeTarget.set(assetRef.sourcePath, relativeTargetPath);
        }

        assetMap.set(assetRef.originalPath, relativeTargetPath);
    }

    return assetMap;
}

function extractAssetReferences(markdown: string) {
    const references = new Map<string, { originalPath: string; sourcePath: string }>();
    for (const pattern of ASSET_DESTINATION_PATTERNS) {
        for (const match of markdown.matchAll(pattern)) {
            const rawDestination = match[1];
            const originalPath = extractDestinationPath(rawDestination);
            const sourcePath = normalizeAssetSourcePath(originalPath);
            if (!originalPath || !sourcePath) {
                continue;
            }

            references.set(originalPath, {
                originalPath,
                sourcePath,
            });
        }
    }
    return [...references.values()];
}

function rewriteAssetLinks(markdown: string, assetMap: Map<string, string>) {
    let output = markdown;
    for (const [sourcePath, relativePath] of assetMap.entries()) {
        output = output.split(sourcePath).join(relativePath);
    }
    return output;
}

function buildTomlFrontMatter(meta: {
    title: string;
    slug: string;
    draft: boolean;
    createdAt: string;
    updatedAt: string;
    category: string;
    tags: string[];
    siyuanId: string;
    siyuanPath: string;
}) {
    const lines = [
        "+++",
        `title = ${JSON.stringify(meta.title)}`,
        `slug = ${JSON.stringify(meta.slug)}`,
        `date = ${JSON.stringify(meta.createdAt)}`,
        `lastmod = ${JSON.stringify(meta.updatedAt)}`,
        `draft = ${meta.draft ? "true" : "false"}`,
    ];

    if (meta.category.trim()) {
        lines.push(`categories = [${JSON.stringify(meta.category.trim())}]`);
    }
    if (meta.tags.length) {
        lines.push(`tags = [${meta.tags.map((tag) => JSON.stringify(tag)).join(", ")}]`);
    }

    lines.push(`siyuan_id = ${JSON.stringify(meta.siyuanId)}`);
    lines.push(`siyuan_path = ${JSON.stringify(meta.siyuanPath)}`);
    lines.push("+++", "");
    return `${lines.join("\n")}`;
}

function syncGitRepo(args: {
    repoPath: string;
    relativeTargetDir: string;
    commitMessage: string;
    messages: ExportMessages;
}) {
    runGit(args.repoPath, ["add", "--", args.relativeTargetDir], args.messages);

    const diffStatus = runGit(args.repoPath, ["diff", "--cached", "--quiet"], args.messages, true);
    if (diffStatus.status === 0) {
        return false;
    }
    if (diffStatus.status !== 1) {
        throw new Error(diffStatus.stderr || args.messages.stagedCheckFailed);
    }

    runGit(args.repoPath, ["commit", "-m", args.commitMessage], args.messages);
    runGit(args.repoPath, ["push"], args.messages);
    return true;
}

function runGit(repoPath: string, args: string[], messages: ExportMessages, allowFailure = false) {
    const node = getNodeRuntime();
    const result = node.childProcess.spawnSync("git", args, {
        cwd: repoPath,
        encoding: "utf8",
    });

    if (!allowFailure && result.status !== 0) {
        const detail = (result.stderr || result.stdout || "").trim();
        throw new Error(detail || formatMessage(messages.gitCommandFailed, { command: `git ${args.join(" ")}` }));
    }
    return {
        status: result.status ?? 1,
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
    };
}

function buildCommitMessage(template: string, values: Record<string, string>) {
    return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? `{${key}}`);
}

function ensureInsideRepo(repoPath: string, targetPath: string, messages: ExportMessages) {
    const node = getNodeRuntime();
    const relative = node.path.relative(repoPath, targetPath);
    if (relative.startsWith("..") || node.path.isAbsolute(relative)) {
        throw new Error(formatMessage(messages.outsideRepoWrite, { path: targetPath }));
    }
}

function sanitizeFileName(value: string) {
    return value
        .trim()
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
        .replace(/\s+/g, " ")
        .replace(/[. ]+$/g, "");
}

function sanitizeSlug(value: string) {
    const cleaned = sanitizeFileName(value)
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    return cleaned || "untitled";
}

function createUniqueName(fileName: string, usedNames: Set<string>) {
    const node = getNodeRuntime();
    if (!usedNames.has(fileName)) {
        usedNames.add(fileName);
        return fileName;
    }

    const parsed = node.path.parse(fileName);
    let index = 1;
    while (true) {
        const candidate = `${parsed.name}-${index}${parsed.ext}`;
        if (!usedNames.has(candidate)) {
            usedNames.add(candidate);
            return candidate;
        }
        index += 1;
    }
}

function parseTags(rawTags: string) {
    if (!rawTags) {
        return [];
    }

    const hashTags = [...rawTags.matchAll(/#([^#\s]+)#/g)].map((match) => match[1].trim());
    const tags = hashTags.length > 0
        ? hashTags
        : rawTags.split(/[,;\uFF0C\uFF1B\s]+/).map((tag) => tag.trim()).filter(Boolean);
    return [...new Set(tags)];
}

function parseBooleanAttr(rawValue: string | undefined, fallback: boolean) {
    if (rawValue === undefined || rawValue === null || rawValue === "") {
        return fallback;
    }
    const normalized = rawValue.trim().toLowerCase();
    return ["1", "true", "yes", "on"].includes(normalized);
}

function toIsoDate(value?: string) {
    if (!value || !/^\d{14}$/.test(value)) {
        return null;
    }

    const year = value.slice(0, 4);
    const month = value.slice(4, 6);
    const day = value.slice(6, 8);
    const hour = value.slice(8, 10);
    const minute = value.slice(10, 12);
    const second = value.slice(12, 14);
    const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return date.toISOString();
}

function lastPathSegment(hPath: string) {
    return hPath.split("/").filter(Boolean).pop() || "";
}

function cleanTitle(value: string) {
    return value.trim().replace(/\s+/g, " ");
}

function normalizeLineEndings(value: string) {
    return value.replace(/\r\n/g, "\n");
}

// SiYuan may emit mixed underline/markdown spans plus zero-width separators that
// Hugo's Goldmark parser handles inconsistently, so normalize those patterns on export.
function normalizeMarkdownForHugo(markdown: string) {
    const lines = normalizeLineEndings(markdown).split("\n");
    let inFence = false;
    let fenceMarker = "";

    const normalizedLines = lines.map((line) => {
        const trimmed = line.trimStart();
        const fenceMatch = trimmed.match(/^(```+|~~~+)/);
        if (fenceMatch) {
            const marker = fenceMatch[1][0];
            if (!inFence) {
                inFence = true;
                fenceMarker = marker;
            } else if (marker === fenceMarker) {
                inFence = false;
                fenceMarker = "";
            }
            return line;
        }

        if (inFence) {
            return line;
        }

        return normalizeInlineFormatting(line);
    });

    return normalizedLines.join("\n");
}

function normalizeInlineFormatting(line: string) {
    return line
        .replace(/\u200b/g, "")
        .replace(/<u>\*\*(.*?)\*\*<\/u>/g, "<u><strong>$1</strong></u>")
        .replace(/\*\*<u>(.*?)<\/u>\*\*/g, "<u><strong>$1</strong></u>")
        .replace(/<u>\*(.*?)\*<\/u>/g, "<u><em>$1</em></u>")
        .replace(/\*<u>(.*?)<\/u>\*/g, "<u><em>$1</em></u>");
}

function extractDestinationPath(rawDestination: string | undefined) {
    if (!rawDestination) {
        return null;
    }

    const trimmed = rawDestination.trim();
    if (!trimmed) {
        return null;
    }

    if (trimmed.startsWith("<")) {
        const closeIndex = trimmed.indexOf(">");
        if (closeIndex > 1) {
            return trimmed.slice(1, closeIndex);
        }
    }

    const spaceIndex = trimmed.search(/\s/);
    return spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);
}

function normalizeAssetSourcePath(rawPath: string | null) {
    if (!rawPath) {
        return null;
    }

    const normalized = rawPath.replace(/\\/g, "/").split(/[?#]/, 1)[0];
    if (normalized.startsWith("/data/assets/")) {
        return normalized;
    }

    const assetIndex = normalized.indexOf("assets/");
    if (assetIndex === -1) {
        return null;
    }

    const assetPath = normalized.slice(assetIndex).replace(/^\/+/, "");
    if (!assetPath.startsWith("assets/")) {
        return null;
    }

    return `/data/${assetPath}`;
}

function buildExportMessages(overrides?: Partial<ExportMessages>): ExportMessages {
    return {
        repoPathRequired: "Please configure the Hugo repository path first.",
        docNotFound: "Document ${docId} was not found.",
        repoNotExists: "Hugo repository does not exist: ${path}",
        notGitRepo: "The configured Hugo path is not a git repository: ${path}",
        assetReadFailed: "Unable to read SiYuan asset: ${path}",
        stagedCheckFailed: "Unable to inspect staged changes.",
        outsideRepoWrite: "Refusing to write outside the Hugo repository: ${path}",
        gitCommandFailed: "Git command failed: ${command}",
        ...overrides,
    };
}

function formatMessage(template: string, values: Record<string, string>) {
    return template.replace(/\$\{(\w+)\}/g, (_, key: string) => values[key] ?? `\${${key}}`);
}
