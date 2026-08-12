import { Notice, Platform, Plugin, TFolder } from "obsidian";

import {
  readAttachmentFolderPath,
  type AttachmentFolderResolution
} from "./attachment-folder";
import {
  NomediaManager,
  type ApplyResult,
  type ManagedPathsStore,
  type RemoveResult
} from "./nomedia-manager";
import { disableProtectionAndRemoveManaged } from "./protection-removal";
import { cloneSettings, coerceSettings } from "./settings-data";
import { GalleryExcluderSettingTab } from "./settings-tab";
import { resolveTargetFolders, type TargetResolution } from "./target-resolver";
import type { GalleryExcluderSettings } from "./types";

type ProtectionOrigin = "startup" | "manual" | "settings-change";

export default class GalleryExcluderPlugin
  extends Plugin
  implements ManagedPathsStore
{
  settings!: GalleryExcluderSettings;

  private manager!: NomediaManager;
  private saveQueue: Promise<void> = Promise.resolve();

  async onload(): Promise<void> {
    await this.loadSettings();
    this.manager = new NomediaManager(this.app.vault.adapter, this);

    this.addSettingTab(new GalleryExcluderSettingTab(this.app, this));
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (file instanceof TFolder) {
          void this.handleCreatedFolder(file.path);
        }
      })
    );

    this.app.workspace.onLayoutReady(() => {
      void this.runProtection("startup");
    });
  }

  getManagedPaths(): readonly string[] {
    return this.settings.managedNomediaPaths;
  }

  async saveManagedPaths(paths: string[]): Promise<void> {
    const previous = this.settings.managedNomediaPaths;
    this.settings.managedNomediaPaths = [...paths];
    try {
      await this.saveSettings();
    } catch (error) {
      this.settings.managedNomediaPaths = previous;
      throw error;
    }
  }

  async saveSettings(): Promise<void> {
    const snapshot = cloneSettings(this.settings);
    const operation = this.saveQueue.then(() => this.saveData(snapshot));
    this.saveQueue = operation.then(
      () => undefined,
      () => undefined
    );
    return operation;
  }

  getAttachmentFolderResolution(): AttachmentFolderResolution {
    return readAttachmentFolderPath(this.app.vault);
  }

  async applyProtectionNow(): Promise<void> {
    await this.runProtection("manual");
  }

  async applyAfterSettingsChange(): Promise<void> {
    await this.runProtection("settings-change");
  }

  async disableProtectionAndRemovePluginCreatedNomedia(): Promise<void> {
    if (!Platform.isAndroidApp) {
      new Notice(
        "Gallery Excluder can disable protection and remove .nomedia files only in the Android app."
      );
      return;
    }

    try {
      const result = await disableProtectionAndRemoveManaged({
        isProtectionEnabled: () => this.settings.enableProtection,
        setProtectionEnabled: (value) => {
          this.settings.enableProtection = value;
        },
        saveSettings: () => this.saveSettings(),
        removeManaged: () => this.manager.removeManaged()
      });
      this.reportRemoveResult(result);
    } catch (error) {
      console.error(
        "Gallery Excluder could not disable protection and remove its managed files.",
        error
      );
      new Notice(
        "Gallery Excluder could not disable protection and remove its managed files. Check the developer console for details.",
        8000
      );
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const data: unknown = await this.loadData();
      this.settings = coerceSettings(data);
    } catch (error) {
      console.error("Gallery Excluder could not load its settings.", error);
      this.settings = coerceSettings(null);
    }
  }

  private resolveCurrentTargets(): TargetResolution {
    return resolveTargetFolders(
      this.settings,
      this.getAttachmentFolderResolution()
    );
  }

  private async runProtection(origin: ProtectionOrigin): Promise<void> {
    if (!Platform.isAndroidApp) {
      return;
    }
    if (!this.settings.enableProtection) {
      if (origin === "manual") {
        new Notice(
          "Enable Gallery Excluder automatic protection before applying it."
        );
      }
      return;
    }

    const targets = this.resolveCurrentTargets();
    this.logTargetIssues(targets);

    if (targets.folders.length === 0) {
      if (targets.issues[0]) {
        new Notice(targets.issues[0], 8000);
      }
      return;
    }

    const result = await this.manager.applyToFolders(targets.folders);
    this.reportApplyResult(result, origin);
  }

  private async handleCreatedFolder(folderPath: string): Promise<void> {
    if (
      !Platform.isAndroidApp ||
      !this.settings.enableProtection
    ) {
      return;
    }

    const targets = this.resolveCurrentTargets();
    if (!targets.folders.includes(folderPath)) {
      return;
    }

    const result = await this.manager.applyToFolders([folderPath]);
    this.reportApplyResult(result, "settings-change");
  }

  private logTargetIssues(targets: TargetResolution): void {
    for (const issue of targets.issues) {
      console.warn(`Gallery Excluder: ${issue}`);
    }
  }

  private reportApplyResult(
    result: ApplyResult,
    origin: ProtectionOrigin
  ): void {
    for (const issue of result.errors) {
      console.error(`Gallery Excluder: ${issue.path}: ${issue.message}`);
    }

    if (result.created.length > 0) {
      const subject =
        result.created.length === 1
          ? "a .nomedia file"
          : `${result.created.length} .nomedia files`;
      new Notice(
        `Gallery Excluder created ${subject} to prevent Android gallery apps from indexing images in this vault.`
      );
      return;
    }

    if (origin !== "manual") {
      return;
    }

    if (result.errors.length > 0) {
      new Notice(
        "Gallery Excluder could not apply protection to one or more locations. Check the developer console for details.",
        8000
      );
    } else if (result.missingFolders.length > 0) {
      new Notice(
        `Gallery Excluder could not find: ${result.missingFolders.join(", ")}. Create the folder, then apply again.`,
        8000
      );
    } else {
      new Notice("Gallery Excluder protection is already in place.");
    }
  }

  private reportRemoveResult(result: RemoveResult): void {
    for (const issue of result.errors) {
      console.error(`Gallery Excluder: ${issue.path}: ${issue.message}`);
    }

    if (result.errors.length > 0) {
      new Notice(
        "Automatic protection is disabled, but Gallery Excluder could not finish removing or updating one or more managed files. Check the developer console for details.",
        8000
      );
    } else if (result.removed.length > 0) {
      new Notice(
        `Automatic protection is disabled. Gallery Excluder removed ${result.removed.length} plugin-created .nomedia file${result.removed.length === 1 ? "" : "s"}.`
      );
    } else {
      new Notice("Automatic protection is disabled.");
    }
  }
}
