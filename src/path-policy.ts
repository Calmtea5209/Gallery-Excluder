export interface NormalizedPath {
  ok: true;
  path: string;
}

export interface InvalidPath {
  ok: false;
  reason: string;
}

export type PathValidation = NormalizedPath | InvalidPath;

export interface NormalizeFolderOptions {
  allowRoot?: boolean;
}

const WINDOWS_ABSOLUTE_PATH = /^[A-Za-z]:[\\/]/;

/**
 * Normalizes a folder path without using Node's path module, which is not
 * available in Obsidian mobile. Traversal is rejected instead of resolved.
 */
export function normalizeVaultFolderPath(
  input: string,
  options: NormalizeFolderOptions = {}
): PathValidation {
  const original = input.trim();

  if (original.includes("\0")) {
    return { ok: false, reason: "Paths cannot contain a null character." };
  }

  if (WINDOWS_ABSOLUTE_PATH.test(original)) {
    return { ok: false, reason: "Absolute paths are not allowed." };
  }

  if (original === "/" && options.allowRoot) {
    return { ok: true, path: "" };
  }

  const slashPath = original.replace(/\\/g, "/");
  if (slashPath.startsWith("/")) {
    return { ok: false, reason: "Absolute paths are not allowed." };
  }

  const normalizedSegments: string[] = [];
  for (const segment of slashPath.split("/")) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === "..") {
      return { ok: false, reason: "Parent path traversal is not allowed." };
    }
    normalizedSegments.push(segment);
  }

  const normalized = normalizedSegments.join("/");
  if (normalized === "") {
    return options.allowRoot
      ? { ok: true, path: "" }
      : { ok: false, reason: "Enter a folder inside the Vault." };
  }

  return { ok: true, path: normalized };
}

export function toNomediaPath(normalizedFolderPath: string): string {
  const validation = normalizeVaultFolderPath(normalizedFolderPath, {
    allowRoot: true
  });
  if (!validation.ok) {
    throw new RangeError(validation.reason);
  }

  return validation.path === ""
    ? ".nomedia"
    : `${validation.path}/.nomedia`;
}

export function parseManagedNomediaPath(input: string): string | null {
  const trimmed = input.trim();
  if (WINDOWS_ABSOLUTE_PATH.test(trimmed)) {
    return null;
  }

  const slashPath = trimmed.replace(/\\/g, "/");
  if (slashPath.startsWith("/")) {
    return null;
  }

  const segments = slashPath.split("/");
  const fileName = segments.pop();

  if (fileName !== ".nomedia") {
    return null;
  }

  const folderValidation = normalizeVaultFolderPath(segments.join("/"), {
    allowRoot: true
  });
  if (!folderValidation.ok) {
    return null;
  }

  return toNomediaPath(folderValidation.path);
}
