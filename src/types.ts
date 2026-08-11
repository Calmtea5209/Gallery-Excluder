export enum ProtectionMode {
  EntireVault = "entire-vault",
  AttachmentFolder = "attachment-folder",
  CustomFolders = "custom-folders"
}

export interface GalleryExcluderSettings {
  enableProtection: boolean;
  protectionMode: ProtectionMode;
  customFolders: string[];
  attachmentFallbackFolder: string;
  managedNomediaPaths: string[];
}

export const DEFAULT_SETTINGS: GalleryExcluderSettings = {
  enableProtection: true,
  protectionMode: ProtectionMode.EntireVault,
  customFolders: [],
  attachmentFallbackFolder: "",
  managedNomediaPaths: []
};
