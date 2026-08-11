import {
  normalizeVaultFolderPath,
  parseManagedNomediaPath,
  toNomediaPath
} from "./path-policy";

export interface AdapterStat {
  type: "file" | "folder";
}

export interface NomediaAdapter {
  exists(path: string, sensitive?: boolean): Promise<boolean>;
  stat(path: string): Promise<AdapterStat | null>;
  write(path: string, data: string): Promise<void>;
  remove(path: string): Promise<void>;
}

export interface ManagedPathsStore {
  getManagedPaths(): readonly string[];
  saveManagedPaths(paths: string[]): Promise<void>;
}

export interface OperationIssue {
  path: string;
  message: string;
}

export interface ApplyResult {
  created: string[];
  existing: string[];
  missingFolders: string[];
  errors: OperationIssue[];
}

export interface RemoveResult {
  removed: string[];
  missing: string[];
  invalid: string[];
  errors: OperationIssue[];
}

export class NomediaManager {
  private operation: Promise<void> = Promise.resolve();

  constructor(
    private readonly adapter: NomediaAdapter,
    private readonly store: ManagedPathsStore
  ) {}

  applyToFolders(folderPaths: readonly string[]): Promise<ApplyResult> {
    return this.enqueue(() => this.applyInternal(folderPaths));
  }

  removeManaged(): Promise<RemoveResult> {
    return this.enqueue(() => this.removeInternal());
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operation.then(operation, operation);
    this.operation = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  private async applyInternal(
    folderPaths: readonly string[]
  ): Promise<ApplyResult> {
    const result: ApplyResult = {
      created: [],
      existing: [],
      missingFolders: [],
      errors: []
    };
    const folders = new Set<string>();

    for (const input of folderPaths) {
      const validation = normalizeVaultFolderPath(input, { allowRoot: true });
      if (!validation.ok) {
        result.errors.push({ path: input, message: validation.reason });
      } else {
        folders.add(validation.path);
      }
    }

    const newlyCreated: string[] = [];
    for (const folder of folders) {
      if (folder !== "" && !(await this.isFolder(folder, result))) {
        continue;
      }

      const nomediaPath = toNomediaPath(folder);
      try {
        if (await this.adapter.exists(nomediaPath, true)) {
          result.existing.push(nomediaPath);
          continue;
        }

        await this.adapter.write(nomediaPath, "");
        newlyCreated.push(nomediaPath);
      } catch (error) {
        result.errors.push({
          path: nomediaPath,
          message: `Could not create .nomedia: ${errorMessage(error)}`
        });
      }
    }

    if (newlyCreated.length === 0) {
      return result;
    }

    const managedPaths = new Set(this.store.getManagedPaths());
    for (const path of newlyCreated) {
      managedPaths.add(path);
    }

    try {
      await this.store.saveManagedPaths([...managedPaths]);
      result.created.push(...newlyCreated);
    } catch (error) {
      await this.rollbackCreatedFiles(newlyCreated, result);
      result.errors.push({
        path: "managedNomediaPaths",
        message: `Could not save managed path tracking: ${errorMessage(error)}`
      });
    }

    return result;
  }

  private async isFolder(folder: string, result: ApplyResult): Promise<boolean> {
    try {
      const stat = await this.adapter.stat(folder);
      if (stat?.type === "folder") {
        return true;
      }
      result.missingFolders.push(folder);
    } catch (error) {
      result.errors.push({
        path: folder,
        message: `Could not inspect folder: ${errorMessage(error)}`
      });
    }
    return false;
  }

  private async rollbackCreatedFiles(
    paths: readonly string[],
    result: ApplyResult
  ): Promise<void> {
    for (const path of paths) {
      try {
        await this.adapter.remove(path);
      } catch (error) {
        result.errors.push({
          path,
          message: `Tracking failed and rollback could not remove the file: ${errorMessage(error)}`
        });
      }
    }
  }

  private async removeInternal(): Promise<RemoveResult> {
    const result: RemoveResult = {
      removed: [],
      missing: [],
      invalid: [],
      errors: []
    };
    const retained = new Set<string>();
    const processed = new Set<string>();

    for (const configuredPath of this.store.getManagedPaths()) {
      const path = parseManagedNomediaPath(configuredPath);
      if (path === null) {
        result.invalid.push(configuredPath);
        continue;
      }
      if (processed.has(path)) {
        continue;
      }
      processed.add(path);

      try {
        if (!(await this.adapter.exists(path, true))) {
          result.missing.push(path);
          continue;
        }
        await this.adapter.remove(path);
        result.removed.push(path);
      } catch (error) {
        retained.add(path);
        result.errors.push({
          path,
          message: `Could not remove managed .nomedia: ${errorMessage(error)}`
        });
      }
    }

    try {
      await this.store.saveManagedPaths([...retained]);
    } catch (error) {
      result.errors.push({
        path: "managedNomediaPaths",
        message: `Could not update managed path tracking: ${errorMessage(error)}`
      });
    }

    return result;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
