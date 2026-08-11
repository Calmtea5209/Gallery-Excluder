import {
  DEFAULT_SETTINGS,
  type GalleryExcluderSettings,
  ProtectionMode
} from "./types";

export function coerceSettings(data: unknown): GalleryExcluderSettings {
  if (!isRecord(data)) {
    return cloneDefaults();
  }

  return {
    enableProtection: booleanValue(
      data.enableProtection,
      DEFAULT_SETTINGS.enableProtection
    ),
    protectionMode: protectionModeValue(data.protectionMode),
    customFolders: stringArray(data.customFolders),
    attachmentFallbackFolder: stringValue(
      data.attachmentFallbackFolder,
      DEFAULT_SETTINGS.attachmentFallbackFolder
    ),
    managedNomediaPaths: stringArray(data.managedNomediaPaths)
  };
}

export function cloneSettings(
  settings: GalleryExcluderSettings
): GalleryExcluderSettings {
  return {
    ...settings,
    customFolders: [...settings.customFolders],
    managedNomediaPaths: [...settings.managedNomediaPaths]
  };
}

function cloneDefaults(): GalleryExcluderSettings {
  return cloneSettings(DEFAULT_SETTINGS);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string"))]
    : [];
}

function protectionModeValue(value: unknown): ProtectionMode {
  return Object.values(ProtectionMode).includes(value as ProtectionMode)
    ? (value as ProtectionMode)
    : DEFAULT_SETTINGS.protectionMode;
}
