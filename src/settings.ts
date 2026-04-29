export const SETTINGS_STORAGE_NAME = "settings";

export const DOC_ATTR_KEYS = {
    slug: "custom-hugo-slug",
    section: "custom-hugo-section",
    draft: "custom-hugo-draft",
} as const;

export interface HugoPluginSettings {
    language: string;
    hugoRepoPath: string;
    contentBaseDir: string;
    defaultCategory: string;
    confirmCategoryBeforeExport: boolean;
    autoPushAfterExport: boolean;
    defaultDraft: boolean;
    commitMessageTemplate: string;
}

export const DEFAULT_SETTINGS: HugoPluginSettings = {
    language: "",
    hugoRepoPath: "",
    contentBaseDir: "content/post",
    defaultCategory: "",
    confirmCategoryBeforeExport: true,
    autoPushAfterExport: false,
    defaultDraft: false,
    commitMessageTemplate: "docs(hugo): sync {title}",
};
