import { Plugin, Menu, getAllEditor, getFrontend, showMessage } from "siyuan";
import "./index.scss";
import { SettingUtils } from "./libs/setting-utils";
import { exportDocumentToHugo } from "./hugo-exporter";
import { hasNodeRuntime } from "./node-runtime";
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_NAME, type HugoPluginSettings } from "./settings";

export default class SiyuanHugoPlugin extends Plugin {
    private isDesktop = false;
    private settingUtils!: SettingUtils;
    private topBarElement?: HTMLElement;

    async onload() {
        this.isDesktop = getFrontend() === "desktop" || getFrontend() === "desktop-window";
        this.registerSettings();
        await this.settingUtils.load();

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

    onunload() {
        console.log(`[${this.name}] unloaded`);
    }

    openSetting(): void {
        this.openPluginSettings();
    }

    private registerSettings() {
        this.settingUtils = new SettingUtils({
            plugin: this,
            name: SETTINGS_STORAGE_NAME,
        });

        this.settingUtils.addItem({
            key: "hugoRepoPath",
            value: DEFAULT_SETTINGS.hugoRepoPath,
            type: "textinput",
            title: this.i18n.hugoRepoPath,
            description: this.i18n.hugoRepoPathDesc,
            action: { callback: () => this.settingUtils.takeAndSave("hugoRepoPath") },
        });
        this.settingUtils.addItem({
            key: "contentBaseDir",
            value: DEFAULT_SETTINGS.contentBaseDir,
            type: "textinput",
            title: this.i18n.contentBaseDir,
            description: this.i18n.contentBaseDirDesc,
            action: { callback: () => this.settingUtils.takeAndSave("contentBaseDir") },
        });
        this.settingUtils.addItem({
            key: "defaultCategory",
            value: DEFAULT_SETTINGS.defaultCategory,
            type: "textinput",
            title: this.i18n.defaultCategory,
            description: this.i18n.defaultCategoryDesc,
            action: { callback: () => this.settingUtils.takeAndSave("defaultCategory") },
        });
        this.settingUtils.addItem({
            key: "commitMessageTemplate",
            value: DEFAULT_SETTINGS.commitMessageTemplate,
            type: "textinput",
            title: this.i18n.commitMessageTemplate,
            description: this.i18n.commitMessageTemplateDesc,
            action: { callback: () => this.settingUtils.takeAndSave("commitMessageTemplate") },
        });
        this.settingUtils.addItem({
            key: "defaultDraft",
            value: DEFAULT_SETTINGS.defaultDraft,
            type: "checkbox",
            title: this.i18n.defaultDraft,
            description: this.i18n.defaultDraftDesc,
            action: {
                callback: async () => {
                    const value = !this.settingUtils.get("defaultDraft");
                    await this.settingUtils.setAndSave("defaultDraft", value);
                },
            },
        });
        this.settingUtils.addItem({
            key: "autoPushAfterExport",
            value: DEFAULT_SETTINGS.autoPushAfterExport,
            type: "checkbox",
            title: this.i18n.autoPushAfterExport,
            description: this.i18n.autoPushAfterExportDesc,
            action: {
                callback: async () => {
                    const value = !this.settingUtils.get("autoPushAfterExport");
                    await this.settingUtils.setAndSave("autoPushAfterExport", value);
                },
            },
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

        try {
            const result = await exportDocumentToHugo(docId, settings, {
                push: forcePush || settings.autoPushAfterExport,
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
        } catch (error) {
            console.error(`[${this.name}] export failed`, error);
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
