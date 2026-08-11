export interface GalleryCacheGuidance {
  title: string;
  introduction: string;
  steps: string[];
  warningStepIndex: number;
}

const GALLERY_CACHE_GUIDANCE: GalleryCacheGuidance = {
  title: "Still seeing old images in Gallery?",
  introduction:
    ".nomedia does not remove images that Gallery has already indexed. Refresh Gallery's cache:",
  steps: [
    "Open “Settings → Apps → Gallery”.",
    "Tap “Force stop”.",
    "Go to “Storage → Clear cache”.",
    "Do not tap “Clear data”; it resets Gallery settings.",
    "Restart your phone, then open Gallery again."
  ],
  warningStepIndex: 3
};

export function getGalleryCacheGuidance(
  isAndroidApp: boolean
): GalleryCacheGuidance | null {
  return isAndroidApp ? GALLERY_CACHE_GUIDANCE : null;
}
