/* eslint-disable jest/expect-expect */
import { basename, join, resolve } from "path";
import tmp from "tmp-promise";
import { pathExists, ensureDir, ensureFile } from "fs-extra";
import { promises as fs } from "fs";

import rmUp, { Options } from "../src/index";

let tempDir: string;
let OPTIONS: Options;
const CWD = process.cwd();

beforeEach(async () => {
  const { path } = await tmp.dir();
  tempDir = path;
  await Promise.all(["a1/a2/a3/a4", "b1/b2/b3/b4", "c1/c2/c3x/c4x", "c1/c2/c3y/c4y"].map((dir) => ensureDir(join(tempDir, dir))));
  await Promise.all(
    [
      "a1/a2/a2.txt",
      "b1/b2/b2.txt",
      "a1/.DS_Store",
      "a1/a2/.DS_Store",
      "a1/a2/a3/.DS_Store",
      "a1/a2/a3/a4/.DS_Store",
      "d1/d11.txt",
      "d1/d12.txt",
      "root.txt",
    ].map((file) => ensureFile(join(tempDir, file)))
  );
  OPTIONS = { cwd: tempDir };
});

afterEach(async () => {
  process.chdir(CWD);
  await fs.rmdir(tempDir, { recursive: true });
});

async function d(paths: Parameters<typeof rmUp>[0], options: Parameters<typeof rmUp>[1], expected: string | string[]) {
  const existenceArray = Array.isArray(expected) ? expected : [expected];
  const previous = await Promise.all(existenceArray.map((path) => pathExists(resolve(tempDir, path))));
  const deleted = await rmUp(paths, options);
  const current = await Promise.all(existenceArray.map((path) => pathExists(resolve(tempDir, path))));
  expect(deleted).toEqual(expected);
  expect(previous).toEqual([...previous].fill(true));
  expect(current).toEqual([...current].fill(false));
}

describe("beforeEach", () => {
  it("should write to temp folder.", async () => {
    const current = await pathExists(resolve(tempDir, "a1"));
    expect(current).toEqual(true);
  });
});

describe("rmUp", () => {
  it("should throw if given path does not a exist.", async () => {
    expect(await rmUp(["a1/NOT_AVAILABLE"], { ...OPTIONS, force: true })).toEqual([]);
  });

  it("should not throw if given path does not a exist, but `force` is `true`.", async () => {
    await expect(rmUp(["a1/NOT_AVAILABLE"], OPTIONS)).rejects.toThrow("ENOENT");
  });

  it("should handle race condition while deleting non empty dirs and ignoring non empty initial dirs and non existing paths with force.", async () => {
    // Create racing conditions with heavy load.
    let paths = ["a1/a2/a3/a4", "a1/a2/a3", "a1/a2/", "a1/a2/", "b1/b2", "b1/b2/b3", "b1/b2/b3/b4", "NON-EXISTING"];
    paths = [...paths, ...paths, ...paths, ...paths, ...paths, ...paths, ...paths, ...paths, ...paths, ...paths, ...paths];
    paths = [...paths, ...paths, ...paths, ...paths, ...paths, ...paths, ...paths, ...paths, ...paths, ...paths, ...paths];
    paths = [...paths, ...paths];
    const deletePaths = [...paths, ...paths, ...paths, ...paths, ...paths, ...paths, ...paths, ...paths, ...paths, ...paths, ...paths];
    const expected = ["a1/a2/a3", "b1/b2/b3"];
    const options = { ...OPTIONS, force: true };

    await d(deletePaths, options, expected);
  }, 10000);

  it("should delete empty parents of non existing path when `force` is `true`.", async () => {
    const deletePaths = "a1/a2/a3/a4/x/y/z";
    const expected = ["a1/a2/a3"];
    const options = { ...OPTIONS, force: true };

    await d(deletePaths, options, expected);
  });

  it("should not delete target path if it is non empty.", async () => {
    const deletePaths = "a1/a2";
    const expected: string[] = [];
    const options = { ...OPTIONS, force: true };

    await d(deletePaths, options, expected);
    expect(await pathExists(resolve(tempDir, "a1"))).toEqual(true);
  });

  it("should delete target path even it is non empty if `deleteInitial` is true.", async () => {
    const deletePaths = ["a1/a2", "a1/a2"];
    const expected = ["a1"];
    const options = { ...OPTIONS, force: true, deleteInitial: true };

    await d(deletePaths, options, expected);
  });

  it("should delete non empty dirs using cwd from process if no cwd provided.", async () => {
    process.chdir(tempDir);
    const deletePaths = "a1/a2/a3/a4";
    const expected = ["a1/a2/a3"];

    await d(deletePaths, undefined, expected);
  });

  it("should delete non empty dirs outside of cwd using absolute paths.", async () => {
    const deletePaths = resolve(tempDir, "a1/a2/a3/a4");
    const options = { ...OPTIONS, cwd: undefined, stop: tempDir };

    const result = await rmUp(deletePaths, options);
    expect(result.map((path) => basename(path))).toEqual(["a3"]);
  });

  it("should delete file and it's empty parent directories.", async () => {
    const deletePaths = ["a1/a2/a3/a4", "a1/a2/a2.txt", "a1/a2/a2.txt"];
    const expected = ["a1"];
    const options = { ...OPTIONS, deleteInitial: true, force: true };

    await d(deletePaths, options, expected);
  });

  it("should delete single file.", async () => {
    const deletePaths = ["d1/d11.txt"];
    const expected = ["d1/d11.txt"];
    const options = { ...OPTIONS, deleteInitial: true };

    await d(deletePaths, options, expected);
  });

  it("should return all deleted entries if `verbose` is `true`.", async () => {
    const deletePaths = ["a1/a2/a3/a4", "a1/a2/a2.txt", "a1/a2/a2.txt"];
    const expected = ["a1", "a1/a2", "a1/a2/a2.txt", "a1/a2/a3", "a1/a2/a3/a4"];
    const options = { ...OPTIONS, deleteInitial: true, force: true, verbose: true };

    await d(deletePaths, options, expected);
  });

  it("should exclude stop dir.", async () => {
    const deletePaths = "a1/a2/a3/a4";
    const expected = [] as string[];
    const options = { ...OPTIONS, stop: "a1/a2/a3/a4" };

    await d(deletePaths, options, expected);
    expect(await pathExists(resolve(tempDir, "a1/a2/a3/a4"))).toEqual(true);
  });

  it("should exclude stop dir (2).", async () => {
    const deletePaths = "a1/a2/a3/a4";
    const expected = ["a1/a2/a3/a4"];
    const options = { ...OPTIONS, stop: "a1/a2/a3" };

    await d(deletePaths, options, expected);
    expect(await pathExists(resolve(tempDir, "a1/a2/a3"))).toEqual(true);
  });

  it("should search up to cwd.", async () => {
    process.chdir(tempDir);
    const deletePaths = join(process.cwd(), "a1/a2/a3/a4");
    const expected = ["a1/a2/a3"];
    const options = { ...OPTIONS, cwd: undefined, stop: undefined };

    await d(deletePaths, options, expected);
  });

  it("should delete paths with common parents.", async () => {
    const deletePaths = ["c1/c2/c3x/c4x", "c1/c2/c3y/c4y"];
    const expected = ["c1"];
    const options = OPTIONS;

    await d(deletePaths, options, expected);
  });

  it("should return absolute paths.", async () => {
    const deletePaths = ["a1/a2/a3/a4"];
    const expected = ["a1/a2/a3"];
    const options = { ...OPTIONS, relative: false };

    const result = await rmUp(deletePaths, options);
    expect(result[0].endsWith(expected[0])).toBe(true);
  });
});
