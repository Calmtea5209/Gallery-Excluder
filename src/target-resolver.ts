import type { AttachmentFolderResolution } from "./attachment-folder";
import { normalizeVaultFolderPath } from "./path-policy";
import type { GalleryExcluderSettings } from "./types";
import { ProtectionMode } from "./types";

export interface TargetResolution {
  folders: string[];
  issues: string[];
}

export function resolveTargetFolders(
  settings: GalleryExcluderSettings,
  attachmentFolder: AttachmentFolderResolution
): TargetResolution {
  switch (settings.protectionMode) {
    case ProtectionMode.EntireVault:
      return { folders: [""], issues: [] };

    case ProtectionMode.AttachmentFolder:
      return resolveAttachmentTarget(settings, attachmentFolder);

    case ProtectionMode.CustomFolders:
      return resolveCustomTargets(settings.customFolders);
  }
}

function resolveAttachmentTarget(
  settings: GalleryExcluderSettings,
  attachmentFolder: AttachmentFolderResolution
): TargetResolution {
  if (attachmentFolder.kind === "resolved") {
    const validation = normalizeVaultFolderPath(attachmentFolder.path, {
      allowRoot: true
    });
    return validation.ok
      ? { folders: [validation.path], issues: [] }
      : { folders: [], issues: [validation.reason] };
  }

  const fallback = normalizeVaultFolderPath(settings.attachmentFallbackFolder);
  if (fallback.ok) {
    return {
      folders: [fallback.path],
      issues: [
        `${attachmentFolder.reason} Using the manually configured fallback folder.`
      ]
    };
  }

  return {
    folders: [],
    issues: [
      `${attachmentFolder.reason} Configure a valid fallback folder in Gallery Excluder settings.`
    ]
  };
}

function resolveCustomTargets(customFolders: readonly string[]): TargetResolution {
  const folders = new Set<string>();
  const issues: string[] = [];

  for (const input of customFolders) {
    const validation = normalizeVaultFolderPath(input);
    if (validation.ok) {
      folders.add(validation.path);
    } else {
      issues.push(`Ignored custom folder "${input}": ${validation.reason}`);
    }
  }

  return { folders: [...folders], issues };
}
