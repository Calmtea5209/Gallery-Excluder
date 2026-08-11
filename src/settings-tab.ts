import {
  App,
  Notice,
  Platform,
  PluginSettingTab,
  Setting
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

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const galleryCacheGuidance = getGalleryCacheGuidance(Platform.isAndroidApp);
    if (galleryCacheGuidance !== null) {
      this.displayGalleryCacheGuidance(containerEl, galleryCacheGuidance);
    }

    new Setting(containerEl)
      .setName("Enable protection")
      .setDesc("Create and manage .nomedia files on Android.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableProtection)
          .onChange(async (value) => {
            this.plugin.settings.enableProtection = value;
            await this.plugin.saveSettings();
            if (value) {
              await this.plugin.applyAfterSettingsChange();
            }
          })
      );

    new Setting(containerEl)
      .setName("Protection mode")
      .setDesc("Choose where Gallery Excluder creates .nomedia files.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption(ProtectionMode.EntireVault, "Entire vault")
          .addOption(
            ProtectionMode.AttachmentFolder,
            "Attachment folder only"
          )
          .addOption(ProtectionMode.CustomFolders, "Custom folders")
          .setValue(this.plugin.settings.protectionMode)
          .onChange(async (value) => {
            this.plugin.settings.protectionMode = value as ProtectionMode;
            await this.plugin.saveSettings();
            await this.plugin.applyAfterSettingsChange();
            this.display();
          })
      );

    if (this.plugin.settings.protectionMode === ProtectionMode.AttachmentFolder) {
      this.displayAttachmentFolderSettings(containerEl);
    }

    if (this.plugin.settings.protectionMode === ProtectionMode.CustomFolders) {
      this.displayCustomFolderSettings(containerEl);
    }

    new Setting(containerEl)
      .setName("Show notification when .nomedia is created")
      .setDesc("Show one notice after Gallery Excluder creates protection files.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showCreationNotice)
          .onChange(async (value) => {
            this.plugin.settings.showCreationNotice = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Apply protection now")
      .setDesc(
        Platform.isAndroidApp
          ? "Check the selected locations immediately."
          : ".nomedia operations run only in the Android app."
      )
      .addButton((button) =>
        button.setButtonText("Apply protection now").setCta().onClick(async () => {
          button.setDisabled(true);
          try {
            await this.plugin.applyProtectionNow();
          } finally {
            button.setDisabled(false);
          }
        })
      );

    new Setting(containerEl)
      .setName("Remove plugin-created .nomedia files")
      .setDesc(
        "Remove only paths recorded as created by Gallery Excluder. Existing user-created files are never added to that record."
      )
      .addButton((button) =>
        button
          .setButtonText("Remove managed files")
          .setWarning()
          .onClick(async () => {
            button.setDisabled(true);
            try {
              await this.plugin.removePluginCreatedNomedia();
            } finally {
              button.setDisabled(false);
            }
          })
      );
  }

  private displayGalleryCacheGuidance(
    containerEl: HTMLElement,
    guidance: GalleryCacheGuidance
  ): void {
    const notice = containerEl.createDiv({
      cls: "gallery-excluder-cache-notice",
      attr: { role: "note" }
    });
    new Setting(notice).setName(guidance.title).setHeading();
    notice.createEl("p", { text: guidance.introduction });

    const steps = notice.createEl("ol");
    for (const [index, step] of guidance.steps.entries()) {
      const item = steps.createEl("li", { text: step });
      if (index === guidance.warningStepIndex) {
        item.addClass("gallery-excluder-cache-notice-warning");
      }
    }
  }

  private displayAttachmentFolderSettings(containerEl: HTMLElement): void {
    const resolution = this.plugin.getAttachmentFolderResolution();
    const description =
      resolution.kind === "resolved"
        ? `Current attachment folder: ${resolution.path || "Vault root"}`
        : resolution.reason;

    new Setting(containerEl)
      .setName("Obsidian attachment folder")
      .setDesc(description);

    if (resolution.kind !== "resolved") {
      new Setting(containerEl)
        .setName("Attachment folder fallback")
        .setDesc(
          "Required when the attachment setting is relative to the current note or cannot be read. Enter one vault-relative folder."
        )
        .addText((text) =>
          text
            .setPlaceholder("Attachments")
            .setValue(this.plugin.settings.attachmentFallbackFolder)
            .onChange(async (value) => {
              this.plugin.settings.attachmentFallbackFolder = value;
              await this.plugin.saveSettings();
            })
        );
    }
  }

  private displayCustomFolderSettings(containerEl: HTMLElement): void {
    new Setting(containerEl).setName("Custom folders").setHeading();

    for (const folder of this.plugin.settings.customFolders) {
      new Setting(containerEl)
        .setName(folder)
        .setDesc("Vault-relative folder")
        .addExtraButton((button) =>
          button
            .setIcon("trash-2")
            .setTooltip(`Remove ${folder}`)
            .onClick(async () => {
              this.plugin.settings.customFolders =
                this.plugin.settings.customFolders.filter(
                  (configured) => configured !== folder
                );
              await this.plugin.saveSettings();
              this.display();
            })
        );
    }

    let pendingFolder = "";
    new Setting(containerEl)
      .setName("Add custom folder")
      .setDesc("Paths must stay inside this vault. Parent traversal is rejected.")
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

          if (!this.plugin.settings.customFolders.includes(validation.path)) {
            this.plugin.settings.customFolders.push(validation.path);
            await this.plugin.saveSettings();
            await this.plugin.applyAfterSettingsChange();
          }
          this.display();
        })
      );
  }
}
