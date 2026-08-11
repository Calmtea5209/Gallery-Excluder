import type { RemoveResult } from "./nomedia-manager";

export interface ProtectionRemovalHost {
  isProtectionEnabled(): boolean;
  setProtectionEnabled(value: boolean): void;
  saveSettings(): Promise<void>;
  removeManaged(): Promise<RemoveResult>;
}

export async function disableProtectionAndRemoveManaged(
  host: ProtectionRemovalHost
): Promise<RemoveResult> {
  const wasEnabled = host.isProtectionEnabled();

  if (wasEnabled) {
    host.setProtectionEnabled(false);
    try {
      await host.saveSettings();
    } catch (error) {
      host.setProtectionEnabled(wasEnabled);
      throw error;
    }
  }

  return host.removeManaged();
}
