import { promises as fs } from "fs";
import { resolve, join, basename } from "path";
import junk from "junk";

type AbsolutePath = string;
type DirName = string;
type Status = "UNPROCESSED" | "PROCESSING" | "READY";

/** An entry in directory. */
export interface Entry {
  path: AbsolutePath;
  isDirectory?: boolean;
}

interface Dir {
  status: Status;
  dirs: Record<DirName, Dir>; // List of subdirectories.
  files: Set<string>; // List of files.
}

interface ConstructorOptions {
  cwd: string;
  stop: string;
  force: boolean;
  deleteInitial: boolean;
}

const STATUS: Record<Status, Status> = {
  UNPROCESSED: "UNPROCESSED",
  PROCESSING: "PROCESSING",
  READY: "READY",
};

/**
 * Class to scan directories from bottom to up to detect empty directories to delete.
 *
 * @ignore
 */
export default class Scanner {
  #options: Required<ConstructorOptions>;
  #index: Record<AbsolutePath, Dir> = {};
  public deletedFiles: Set<AbsolutePath> = new Set();
  public deletedDirs: Set<AbsolutePath> = new Set();

  public constructor(options: ConstructorOptions) {
    this.#options = options;
  }

  /**
   * Calculates top paths to delete to delete empty directories up from given paths.
   *
   * @param paths is the path or are the list of paths to calculate from.
   * @returns entires to be deleted.
   */
  public async getPathsToDelete(paths: string | string[]): Promise<Entry[]> {
    const arrayPaths = Array.isArray(paths) ? paths : [paths];
    const absolutePaths = arrayPaths.map((path) => resolve(this.#options.cwd, path));
    await Promise.all(absolutePaths.map((path) => this.readDirUp(path)));
    const pathsToDelete = absolutePaths.map((path) => this.getTopPathToDelete(path)).filter((path) => path !== undefined) as Entry[];
    return Scanner.filterSubPaths(pathsToDelete);
  }

  /**
   * Filters paths by eliminating sub paths contained by another path.
   *
   * @param paths are the paths to filter.
   * @returns filtered paths.
   * @example
   * filterSubPaths(["a/b/c", "a/b"]); // Returns ["a/b"]. 'a/b/c' is deleted because 'a/b/c' is a subpath of 'a/b'.
   */
  private static filterSubPaths(paths: Entry[]): Entry[] {
    const sorted = paths.sort((a, b) => a.path.length - b.path.length); // Sort for a faster comparison.

    for (let i = 0; i < sorted.length; i += 1) {
      for (let k = i + 1; k < sorted.length; k += 1) {
        if (sorted[k].path.startsWith(sorted[i].path)) {
          sorted.splice(k, 1); // Remove contained element
          k -= 1; // Since array shortened by one, reduce index by one.
        }
      }
    }

    return sorted;
  }

  /**
   * Tests whether given path is contained by stop path.
   *
   * @path is the path to test.
   * @returns whether path is contained by stop path.
   */
  private belowStop(path: AbsolutePath): boolean {
    return path !== this.#options.stop && path.startsWith(this.#options.stop);
  }

  /**
   * Recursively read directory contents from given path up to stop path and populates data in object.
   *
   * @param path is the path to read contents of.
   */
  private async readDirUp(path: AbsolutePath, isInitial = true): Promise<void> {
    /* istanbul ignore next */
    const isAdded = this.#index[path]?.status === STATUS.PROCESSING || this.#index[path]?.status === STATUS.READY;
    if (isAdded || !this.belowStop(path)) return;
    const dir: Dir = { status: STATUS.PROCESSING, files: new Set(), dirs: {} };
    this.#index[path] = dir;

    // Promise.all() rejects immediatly if fs.readdir() fails because entry is a file.
    const [entries] = await Promise.allSettled([fs.readdir(path, { withFileTypes: true }), this.readDirUp(join(path, ".."), false)]);

    if (entries.status === "fulfilled") {
      entries.value.forEach((entry) => {
        if (entry.isDirectory()) {
          const entryPath = join(path, entry.name);
          if (!this.#index[entryPath]) this.#index[entryPath] = { status: STATUS.UNPROCESSED, files: new Set(), dirs: {} };
          dir.dirs[entry.name] = this.#index[entryPath];
        } else if (junk.not(entry.name)) dir.files.add(entry.name);
      });
    } else {
      const ignoreFileError = this.#options.deleteInitial && isInitial && entries.reason.code === "ENOTDIR";
      const ignoreDirError = this.#options.force && isInitial && (entries.reason.code === "ENOTDIR" || entries.reason.code === "ENOENT");
      if (!ignoreFileError && !ignoreDirError) throw entries.reason;
      delete this.#index[path];
    }

    dir.status = STATUS.READY;
  }

  /**
   * Deletes empty directories up from memory recursively and calculates a single path to delete for given start path.
   *
   * @param path is the path to delete.
   * @param currentTopPath is the current top path for the initial path given at recursion start.
   * @returns top path to delete for the initial given path. If none can be found returns `undefined`.
   * @example
   * // For example assuming 'a/b/c', 'a/a.txt' files exist, 'a/b' is the top empty path to delete. No need to delete 'a/b/c' seperately.
   * deleteFromMemory("a/b/c"); // [{ path: "a/b", isDirectory: true }]
   */
  private getTopPathToDelete(path: AbsolutePath, isInitial = true, currentTopPath?: Entry): Entry | undefined {
    if (!this.belowStop(path)) return currentTopPath;

    let newTopPath = currentTopPath;
    const dir: Dir | undefined = this.#index[path];
    const baseName = basename(path);
    const parentPath = join(path, "..");
    const deleteInitial = isInitial && this.#options.deleteInitial;

    if (!dir && this.#index[parentPath]?.files.has(basename(baseName)) && deleteInitial) {
      this.deletedFiles.add(path);
      /* istanbul ignore next */
      this.#index[parentPath]?.files.delete(baseName);
      newTopPath = { path, isDirectory: false };
    } else if (dir && dir.status === STATUS.READY && (deleteInitial || (dir.files.size === 0 && Object.keys(dir.dirs).length === 0))) {
      delete this.#index[path];
      delete this.#index[parentPath]?.dirs[baseName];
      this.#index[parentPath]?.files.delete(baseName);
      this.deletedDirs.add(path);
      newTopPath = { path, isDirectory: true };
    }
    return this.getTopPathToDelete(parentPath, false, newTopPath);
  }
}
