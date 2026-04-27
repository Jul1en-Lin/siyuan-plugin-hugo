export const SETTINGS_STORAGE_NAME = "settings";

export const DOC_ATTR_KEYS = {
    slug: "custom-hugo-slug",
    section: "custom-hugo-section",
    draft: "custom-hugo-draft",
} as const;

export interface HugoPluginSettings {
    hugoRepoPath: string;
    contentBaseDir: string;
    defaultCategory: string;
    autoPushAfterExport: boolean;
    defaultDraft: boolean;
    commitMessageTemplate: string;
}

export const DEFAULT_SETTINGS: HugoPluginSettings = {
    hugoRepoPath: "",
    contentBaseDir: "content/post",
    defaultCategory: "",
    autoPushAfterExport: false,
    defaultDraft: false,
    commitMessageTemplate: "docs(hugo): sync {title}",
};
