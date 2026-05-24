import { access, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { ConfigLoadError, type ProjectInfo } from "@cms-lab/core";

export async function detectNextProject(cwd: string): Promise<ProjectInfo> {
  const rootDir = resolve(cwd);
  const hasNext =
    (await hasAny(rootDir, [
      "next.config.js",
      "next.config.mjs",
      "next.config.ts",
    ])) || (await packageUsesNext(rootDir));

  if (!hasNext) {
    throw new ConfigLoadError(`No Next.js project detected in ${rootDir}`);
  }

  const appDir = await firstExisting(rootDir, ["app", "src/app"]);
  if (appDir) {
    return {
      framework: "next",
      router: "app",
      rootDir,
      appDir,
    };
  }

  const pagesDir = await firstExisting(rootDir, ["pages", "src/pages"]);
  if (pagesDir) {
    return {
      framework: "next",
      router: "pages",
      rootDir,
      pagesDir,
    };
  }

  throw new ConfigLoadError(
    `Next.js project detected, but no app or pages directory was found in ${rootDir}`,
  );
}

async function packageUsesNext(rootDir: string): Promise<boolean> {
  try {
    const packageJson = JSON.parse(
      await readFile(join(rootDir, "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    return Boolean(
      packageJson.dependencies?.next || packageJson.devDependencies?.next,
    );
  } catch {
    return false;
  }
}

async function hasAny(rootDir: string, paths: string[]): Promise<boolean> {
  for (const path of paths) {
    if (await exists(join(rootDir, path))) {
      return true;
    }
  }

  return false;
}

async function firstExisting(
  rootDir: string,
  paths: string[],
): Promise<string | undefined> {
  for (const path of paths) {
    const fullPath = join(rootDir, path);
    if (await exists(fullPath)) {
      return fullPath;
    }
  }

  return undefined;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
