import { Plugin, Menu, getAllEditor, getFrontend, showMessage } from "siyuan";
import "./index.scss";
import { SettingUtils } from "./libs/setting-utils";
import { exportDocumentToHugo } from "./hugo-exporter";
import { hasNodeRuntime, getNodeRuntime } from "./node-runtime";
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_NAME, type HugoPluginSettings } from "./settings";
import { getBlockByID, lsNotebooks } from "@/api";
import { confirmDialog } from "./libs/dialog";

import zhCN from "../public/i18n/zh_CN.json";
import enUS from "../public/i18n/en_US.json";

const I18N_MAP: Record<string, any> = {
    "": undefined,
    zh_CN: zhCN,
    en_US: enUS,
};

export default class SiyuanHugoPlugin extends Plugin {
    private isDesktop = false;
    private settingUtils!: SettingUtils;
    private topBarElement?: HTMLElement;
    private currentLanguage = DEFAULT_SETTINGS.language;

    async onload() {
        this.isDesktop = getFrontend() === "desktop" || getFrontend() === "desktop-window";

        const saved = await this.loadData(`${SETTINGS_STORAGE_NAME}.json`);
        const language = saved?.language ?? DEFAULT_SETTINGS.language;
        this.currentLanguage = language;
        if (language && I18N_MAP[language]) {
            this.i18n = I18N_MAP[language];
        }

        this.registerSettings();
        await this.settingUtils.load(saved);

        this.addCommand({
            langKey: "exportCurrentDocCommand",
            callback: () => this.runExport(false),
        });
        this.addCommand({
            langKey: "exportAndPushCommand",
            callback: () => this.runExport(true),
        });
        this.addCommand({
            langKey: "openPluginSettingsCommand",
            callback: () => this.openPluginSettings(),
        });
    }

    onLayoutReady() {
        this.topBarElement = this.addTopBar({
            icon: "iconUpload",
            title: this.i18n.exportMenuTitle,
            position: "right",
            callback: () => this.openTopBarMenu(),
        });
    }

    onunload() {}

    async uninstall() {
        await this.removeData(`${SETTINGS_STORAGE_NAME}.json`);
    }

    openSetting(): void {
        this.openPluginSettings();
    }

    private registerSettings() {
        this.settingUtils = new SettingUtils({
            plugin: this,
            name: SETTINGS_STORAGE_NAME,
            callback: (data: HugoPluginSettings) => this.applyLanguageSetting(data.language),
        });

        this.settingUtils.addItem({
            key: "language",
            value: DEFAULT_SETTINGS.language,
            type: "select",
            title: this.i18n.language,
            description: this.i18n.languageDesc,
            options: {
                "": this.i18n.languageAuto,
                zh_CN: "简体中文",
                en_US: "English",
            },
        });

        this.settingUtils.addItem({
            key: "hugoRepoPath",
            value: DEFAULT_SETTINGS.hugoRepoPath,
            type: "textinput",
            title: this.i18n.hugoRepoPath,
            description: this.i18n.hugoRepoPathDesc,
        });
        this.settingUtils.addItem({
            key: "contentBaseDir",
            value: DEFAULT_SETTINGS.contentBaseDir,
            type: "textinput",
            title: this.i18n.contentBaseDir,
            description: this.i18n.contentBaseDirDesc,
        });
        this.settingUtils.addItem({
            key: "defaultCategory",
            value: DEFAULT_SETTINGS.defaultCategory,
            type: "textinput",
            title: this.i18n.defaultCategory,
            description: this.i18n.defaultCategoryDesc,
        });
        this.settingUtils.addItem({
            key: "commitMessageTemplate",
            value: DEFAULT_SETTINGS.commitMessageTemplate,
            type: "textinput",
            title: this.i18n.commitMessageTemplate,
            description: this.i18n.commitMessageTemplateDesc,
        });
        this.settingUtils.addItem({
            key: "defaultDraft",
            value: DEFAULT_SETTINGS.defaultDraft,
            type: "checkbox",
            title: this.i18n.defaultDraft,
            description: this.i18n.defaultDraftDesc,
        });
        this.settingUtils.addItem({
            key: "autoPushAfterExport",
            value: DEFAULT_SETTINGS.autoPushAfterExport,
            type: "checkbox",
            title: this.i18n.autoPushAfterExport,
            description: this.i18n.autoPushAfterExportDesc,
        });
        this.settingUtils.addItem({
            key: "stripDefaultImageAltText",
            value: DEFAULT_SETTINGS.stripDefaultImageAltText,
            type: "checkbox",
            title: this.i18n.stripDefaultImageAltText,
            description: this.i18n.stripDefaultImageAltTextDesc,
        });
        this.settingUtils.addItem({
            key: "confirmCategoryBeforeExport",
            value: DEFAULT_SETTINGS.confirmCategoryBeforeExport,
            type: "checkbox",
            title: this.i18n.confirmCategoryBeforeExport,
            description: this.i18n.confirmCategoryBeforeExportDesc,
        });
        this.settingUtils.addItem({
            key: "hint",
            value: "",
            type: "hint",
            title: this.i18n.hintTitle,
            description: this.i18n.hintDesc,
        });
    }

    private openTopBarMenu() {
        const menu = new Menu("siyuan-hugo-menu");
        menu.addItem({
            icon: "iconUpload",
            label: this.i18n.exportCurrentDocMenu,
            click: () => this.runExport(false),
        });
        menu.addItem({
            icon: "iconUpload",
            label: this.i18n.exportAndPushMenu,
            click: () => this.runExport(true),
        });
        menu.addSeparator();
        menu.addItem({
            icon: "iconSettings",
            label: this.i18n.openPluginSettingsMenu,
            click: () => this.openPluginSettings(),
        });

        const rect = this.resolveTopBarRect();
        menu.open({
            x: rect.right,
            y: rect.bottom,
            isLeft: true,
        });
    }

    private applyLanguageSetting(language: string) {
        if (language === this.currentLanguage) {
            return;
        }
        this.currentLanguage = language;
        const next = I18N_MAP[language];
        if (next) {
            this.i18n = next;
        }
        showMessage(this.i18n.languageChanged);
    }

    private async runExport(forcePush: boolean) {
        if (!this.isDesktop || !hasNodeRuntime()) {
            showMessage(this.i18n.desktopOnly);
            return;
        }

        const docId = this.getCurrentDocId();
        if (!docId) {
            showMessage(this.i18n.noDocOpen);
            return;
        }

        const settings = this.getSettings();
        if (!settings.hugoRepoPath.trim()) {
            this.openPluginSettings();
            showMessage(this.i18n.repoPathRequired);
            return;
        }

        const docBlock = await getBlockByID(docId);
        const notebooksRes = await lsNotebooks();
        const notebook = notebooksRes?.notebooks?.find((n) => n.id === docBlock?.box);
        let category = notebook?.name?.trim() || settings.defaultCategory;

        if (settings.confirmCategoryBeforeExport) {
            const existingCategories = scanExistingCategories(settings.hugoRepoPath, settings.contentBaseDir);
            const confirmed = await this.confirmCategoryDialog(category, existingCategories);
            if (confirmed === null) {
                return;
            }
            category = confirmed.trim();
        }

        try {
            const result = await exportDocumentToHugo(docId, settings, {
                push: forcePush || settings.autoPushAfterExport,
                category,
                messages: {
                    repoPathRequired: this.i18n.repoPathRequired,
                    docNotFound: this.i18n.docNotFound,
                    repoNotExists: this.i18n.repoNotExists,
                    notGitRepo: this.i18n.notGitRepo,
                    assetReadFailed: this.i18n.assetReadFailed,
                    stagedCheckFailed: this.i18n.stagedCheckFailed,
                    outsideRepoWrite: this.i18n.outsideRepoWrite,
                    gitCommandFailed: this.i18n.gitCommandFailed,
                },
            });
            const template = result.pushed
                ? this.i18n.exportAndPushSuccess
                : this.i18n.exportSuccess;
            showMessage(
                template
                    .replace("${title}", result.title)
                    .replace("${count}", String(result.assetCount)),
            );

            if (result.skippedAssets.length > 0) {
                const skippedNames = result.skippedAssets
                    .map((p) => decodeURIComponent(p.split("/").pop() || p))
                    .join(", ");
                showMessage(`${this.i18n.assetsSkipped}: ${skippedNames}`);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            showMessage(`${this.i18n.exportFailed}: ${message}`);
        }
    }

    private openPluginSettings() {
        if (this.setting?.open) {
            this.setting.open(this.name);
            return;
        }
        showMessage(this.i18n.settingsUnavailable);
    }

    private getSettings(): HugoPluginSettings {
        return {
            ...DEFAULT_SETTINGS,
            ...(this.settingUtils.dump() as Partial<HugoPluginSettings>),
        };
    }

    private getCurrentDocId() {
        const editors = getAllEditor();
        if (editors.length === 0) {
            return undefined;
        }

        // Prefer the editor that currently has focus
        const focusedEditor = editors.find((e) =>
            e.protyle?.element?.contains(document.activeElement)
        );
        if (focusedEditor) {
            return focusedEditor.protyle.block.rootID;
        }

        // Fall back to the first visible editor (not inside a hidden tab container)
        const visibleEditor = editors.find((e) =>
            e.protyle?.element && !e.protyle.element.closest(".fn__none")
        );
        if (visibleEditor) {
            return visibleEditor.protyle.block.rootID;
        }

        // Ultimate fallback to the first editor in DOM order
        return editors[0]?.protyle?.block?.rootID;
    }

    private confirmCategoryDialog(detectedCategory: string, existingCategories: string[]): Promise<string | null> {
        return new Promise((resolve) => {
            const container = document.createElement("div");
            const initialSelected = detectedCategory
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

            let html = "";
            if (existingCategories.length > 0) {
                html += `<div style="margin-bottom:4px;font-weight:bold">${this.i18n.categoryListTitle}</div>`;
                html += `<div style="max-height:120px;overflow-y:auto;margin-bottom:12px">`;
                for (const cat of existingCategories) {
                    const checked = initialSelected.includes(cat) ? "checked" : "";
                    html += `<label style="display:block;margin:4px 0;cursor:pointer"><input type="checkbox" value="${cat}" ${checked}> ${cat}</label>`;
                }
                html += `</div>`;
            }
            html += `<div style="margin-bottom:4px;font-weight:bold">${this.i18n.customCategoryLabel}</div>`;
            html += `<input type="text" class="b3-text-field fn__block category-custom-input" value="">`;
            html += `<div style="margin-top:4px;font-size:12px;color:var(--b3-theme-on-surface-light)">${this.i18n.customCategoryHint}</div>`;

            container.innerHTML = html;
            const input = container.querySelector(".category-custom-input") as HTMLInputElement;

            confirmDialog({
                title: this.i18n.confirmCategoryTitle,
                content: container,
                confirm: () => {
                    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
                    const checked = Array.from(checkboxes)
                        .filter((cb: HTMLInputElement) => cb.checked)
                        .map((cb: HTMLInputElement) => cb.value);
                    const custom = input.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                    const merged = [...new Set([...checked, ...custom])];
                    resolve(merged.join(","));
                },
                cancel: () => resolve(null),
            });
        });
    }

    private resolveTopBarRect() {
        let rect = this.topBarElement?.getBoundingClientRect();
        if (!rect || rect.width === 0) {
            rect = document.querySelector("#barMore")?.getBoundingClientRect();
        }
        if (!rect || rect.width === 0) {
            rect = document.querySelector("#barPlugins")?.getBoundingClientRect();
        }
        return rect ?? new DOMRect(window.innerWidth - 48, 32, 0, 0);
    }
}

function scanExistingCategories(repoPath: string, contentBaseDir: string): string[] {
    const node = getNodeRuntime();
    const contentDir = node.path.resolve(repoPath, contentBaseDir.trim().replace(/^[\\/]+|[\\/]+$/g, ""));
    if (!node.fs.existsSync(contentDir)) {
        return [];
    }

    const categories = new Set<string>();
    function walk(dir: string) {
        for (const entry of node.fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = node.path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.name === "index.md") {
                try {
                    const content = node.fs.readFileSync(fullPath, "utf8");
                    // Array format: categories = ["a", "b"]
                    const arrayMatch = content.match(/categories\s*=\s*\[([^\]]*)\]/);
                    if (arrayMatch) {
                        const inner = arrayMatch[1];
                        const re = /"([^"]*)"|'([^']*)'/g;
                        let m;
                        while ((m = re.exec(inner)) !== null) {
                            categories.add(m[1] ?? m[2]);
                        }
                    }
                    // String format: categories = "Git"
                    const stringMatch = content.match(/categories\s*=\s*"([^"]*)"/);
                    if (stringMatch) {
                        categories.add(stringMatch[1]);
                    }
                    const stringMatch2 = content.match(/categories\s*=\s*'([^']*)'/);
                    if (stringMatch2) {
                        categories.add(stringMatch2[1]);
                    }
                } catch {
                    // ignore unreadable files
                }
            }
        }
    }
    walk(contentDir);
    return Array.from(categories).sort();
}
