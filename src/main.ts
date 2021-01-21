import { promises as fs } from "fs";
import { resolve, relative as getRelative } from "path";
import Scanner from "./scanner";

/** Options */
export interface Options {
  /** Current working directory to be used with relative input paths. */
  cwd?: string;
  /** Path to stop searching empty directories up. Stop directory is not included (not deleted). */
  stop?: string;
  /** If true, no error is thrown if input path is not a directory or does not exists. CWD is used by default. */
  force?: boolean;
  /** Delete target path (bottom directory) even it is non-empty directory. For example even if `c` directory of `a/b/c` has some files in it, `c` will be deleted. */
  deleteInitial?: boolean;
  /** Dry run without deleting any files. */
  dry?: boolean;
  /** If true returns all deleted directories and files. Otherwise returns only paths which delete command is executed agains. */
  verbose?: boolean;
  /** If true returns paths are relative to cwd, otherwise absolute paths. */
  relative?: boolean;
}

/**
 * Delete files or empty directories and their empty parents up to `stop` path excluding `stop` path.
 *
 * @param paths are the list of directories to be deleted with their empty parents.
 * @param options are options.
 */
export async function rmUp(
  paths: string | string[],
  { cwd = "", stop = "", force = false, deleteInitial = false, relative = true, dry, verbose }: Options = {}
): Promise<string[]> {
  const scanner = new Scanner({ cwd: resolve(cwd), stop: resolve(cwd, stop), force, deleteInitial });
  const toDelete = await scanner.getPathsToDelete(paths);
  if (!dry && toDelete.length > 0)
    await Promise.all(toDelete.map((entry) => (entry.isDirectory ? fs.rmdir(entry.path, { recursive: true }) : fs.unlink(entry.path))));
  let deletedPaths = verbose ? [...scanner.deletedDirs, ...scanner.deletedFiles] : toDelete.map((entry) => entry.path);
  if (relative) deletedPaths = deletedPaths.map((path) => getRelative(resolve(cwd), path));
  return deletedPaths.sort();
}
