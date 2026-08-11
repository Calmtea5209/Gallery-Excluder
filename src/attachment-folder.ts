import type { Vault } from "obsidian";

import { normalizeVaultFolderPath } from "./path-policy";

export type AttachmentFolderResolution =
  | { kind: "resolved"; path: string }
  | { kind: "dynamic"; reason: string }
  | { kind: "unavailable"; reason: string }
  | { kind: "invalid"; reason: string };

interface VaultConfigReader {
  getConfig(key: string): unknown;
}

export function interpretAttachmentFolderPath(
  value: unknown
): AttachmentFolderResolution {
  if (typeof value !== "string") {
    return {
      kind: "unavailable",
      reason: "Obsidian did not provide an attachment folder setting."
    };
  }

  const setting = value.trim();
  if (setting === "/" || setting === "") {
    return { kind: "resolved", path: "" };
  }

  const slashPath = setting.replace(/\\/g, "/");
  if (slashPath === "." || slashPath.startsWith("./")) {
    return {
      kind: "dynamic",
      reason: "The attachment folder is relative to the current note."
    };
  }

  const validation = normalizeVaultFolderPath(setting);
  if (!validation.ok) {
    return { kind: "invalid", reason: validation.reason };
  }

  return { kind: "resolved", path: validation.path };
}

/**
 * Obsidian currently has no documented typed getter for this preference.
 * The runtime Vault exposes getConfig, so use a narrow capability check and
 * fail closed if that method ever becomes unavailable.
 */
export function readAttachmentFolderPath(
  vault: Vault
): AttachmentFolderResolution {
  const candidate = vault as Vault & Partial<VaultConfigReader>;
  if (typeof candidate.getConfig !== "function") {
    return {
      kind: "unavailable",
      reason: "This Obsidian version does not expose the attachment folder setting."
    };
  }

  try {
    return interpretAttachmentFolderPath(
      candidate.getConfig("attachmentFolderPath")
    );
  } catch (error) {
    return {
      kind: "unavailable",
      reason: `Could not read the attachment folder setting: ${errorMessage(error)}`
    };
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
