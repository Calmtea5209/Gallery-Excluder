import {
  App,
  Notice,
  Platform,
  PluginSettingTab,
  type Setting,
  type SettingDefinitionItem
} from "obsidian";

import { normalizeVaultFolderPath } from "./path-policy";
import {
  getGalleryCacheGuidance,
  type GalleryCacheGuidance
} from "./gallery-cache-guidance";
import type GalleryExcluderPlugin from "./main";
import { ProtectionMode } from "./types";

export class GalleryExcluderSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: GalleryExcluderPlugin) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    const definitions: SettingDefinitionItem[] = [];
    const galleryCacheGuidance = getGalleryCacheGuidance(Platform.isAndroidApp);
    if (galleryCacheGuidance !== null) {
      definitions.push(this.galleryCacheDefinition(galleryCacheGuidance));
    }

    const attachmentResolution = this.plugin.getAttachmentFolderResolution();
    const attachmentDescription =
      attachmentResolution.kind === "resolved"
        ? `Current attachment folder: ${attachmentResolution.path || "Vault root"}`
        : attachmentResolution.reason;

    definitions.push(
      {
        name: "Automatic protection",
        desc: Platform.isAndroidApp
          ? "Creates and maintains .nomedia files. Turning this off also removes files created by Gallery Excluder."
          : ".nomedia operations are available only in the Android app.",
        control: {
          type: "toggle",
          key: "enableProtection",
          disabled: () => !Platform.isAndroidApp
        }
      },
      {
        name: "Protection mode",
        desc: "Choose where Gallery Excluder creates .nomedia files.",
        control: {
          type: "dropdown",
          key: "protectionMode",
          options: {
            [ProtectionMode.EntireVault]: "Entire vault",
            [ProtectionMode.AttachmentFolder]: "Attachment folder only",
            [ProtectionMode.CustomFolders]: "Custom folders"
          }
        }
      },
      {
        name: "Attachment folder",
        desc: attachmentDescription,
        visible: () =>
          this.plugin.settings.protectionMode ===
          ProtectionMode.AttachmentFolder
      },
      {
        name: "Attachment folder fallback",
        desc: "Required when the attachment setting is relative to the current note or cannot be read. Enter one vault-relative folder.",
        visible: () =>
          this.plugin.settings.protectionMode ===
            ProtectionMode.AttachmentFolder &&
          attachmentResolution.kind !== "resolved",
        control: {
          type: "text",
          key: "attachmentFallbackFolder",
          placeholder: "Attachments"
        }
      },
      this.customFoldersDefinition(),
      {
        name: "Apply protection now",
        desc: Platform.isAndroidApp
          ? "Check the selected locations immediately."
          : ".nomedia operations run only in the Android app.",
        render: (setting) => {
          setting.addButton((button) =>
            button
              .setButtonText("Apply protection now")
              .setCta()
              .onClick(async () => {
                button.setDisabled(true);
                try {
                  await this.plugin.applyProtectionNow();
                } finally {
                  button.setDisabled(false);
                }
              })
          );
        }
      }
    );

    return definitions;
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    switch (key) {
      case "enableProtection":
        if (typeof value !== "boolean") {
          return;
        }
        if (value) {
          this.plugin.settings.enableProtection = true;
          await this.plugin.saveSettings();
          await this.plugin.applyProtectionNow();
        } else {
          await this.plugin.disableProtectionAndRemovePluginCreatedNomedia();
        }
        this.update();
        return;

      case "protectionMode":
        if (!Object.values(ProtectionMode).includes(value as ProtectionMode)) {
          return;
        }
        this.plugin.settings.protectionMode = value as ProtectionMode;
        await this.plugin.saveSettings();
        await this.plugin.applyAfterSettingsChange();
        this.update();
        return;

      case "attachmentFallbackFolder":
        if (typeof value !== "string") {
          return;
        }
        this.plugin.settings.attachmentFallbackFolder = value;
        await this.plugin.saveSettings();
        return;

      default:
        await super.setControlValue(key, value);
    }
  }

  private galleryCacheDefinition(
    guidance: GalleryCacheGuidance
  ): SettingDefinitionItem {
    return {
      name: guidance.title,
      desc: guidance.introduction,
      aliases: ["Gallery cache", "Old images"],
      render: (setting) => {
        this.renderGalleryCacheGuidance(setting, guidance);
      }
    };
  }

  private renderGalleryCacheGuidance(
    setting: Setting,
    guidance: GalleryCacheGuidance
  ): void {
    setting.setHeading();
    setting.settingEl.addClass("gallery-excluder-cache-notice");

    const steps = setting.infoEl.createEl("ol");
    for (const [index, step] of guidance.steps.entries()) {
      const item = steps.createEl("li", { text: step });
      if (index === guidance.warningStepIndex) {
        item.addClass("gallery-excluder-cache-notice-warning");
      }
    }
  }

  private customFoldersDefinition(): SettingDefinitionItem {
    let pendingFolder = "";

    return {
      type: "group",
      heading: "Custom folders",
      visible: () =>
        this.plugin.settings.protectionMode === ProtectionMode.CustomFolders,
      items: [
        ...this.plugin.settings.customFolders.map((folder) => ({
          name: folder,
          desc: "Vault-relative folder",
          render: (setting: Setting) => {
            setting.addExtraButton((button) =>
              button
                .setIcon("trash-2")
                .setTooltip(`Remove ${folder}`)
                .onClick(async () => {
                  this.plugin.settings.customFolders =
                    this.plugin.settings.customFolders.filter(
                      (configured) => configured !== folder
                    );
                  await this.plugin.saveSettings();
                  this.update();
                })
            );
          }
        })),
        {
          name: "Add custom folder",
          desc: "Paths must stay inside this vault. Parent traversal is rejected.",
          render: (setting) => {
            setting
              .addText((text) =>
                text.setPlaceholder("Assets/images").onChange((value) => {
                  pendingFolder = value;
                })
              )
              .addButton((button) =>
                button.setButtonText("Add").onClick(async () => {
                  const validation = normalizeVaultFolderPath(pendingFolder);
                  if (!validation.ok) {
                    new Notice(`Gallery Excluder: ${validation.reason}`);
                    return;
                  }

                  if (
                    !this.plugin.settings.customFolders.includes(
                      validation.path
                    )
                  ) {
                    this.plugin.settings.customFolders.push(validation.path);
                    await this.plugin.saveSettings();
                    await this.plugin.applyAfterSettingsChange();
                  }
                  this.update();
                })
              );
          }
        }
      ]
    };
  }
}
