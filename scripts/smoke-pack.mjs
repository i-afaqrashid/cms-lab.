#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readdir, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isLive = process.argv.includes("--live");
const skipBuild = process.argv.includes("--skip-build");
const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

if (!skipBuild) {
  await run(packageManager, ["build"], { cwd: rootDir });
}

const workspace = await mkdtemp(join(tmpdir(), "cms-lab-pack-smoke-"));
const packDir = join(workspace, "pack");
const appDir = join(workspace, "app");

await mkdir(packDir, { recursive: true });
await mkdir(join(appDir, "app"), { recursive: true });

await run(
  packageManager,
  ["-r", "--filter", "./packages/*", "pack", "--pack-destination", packDir],
  { cwd: rootDir },
);

const tarballs = await readdir(packDir);
const installTarballs = [
  findTarball(tarballs, /^cms-lab-core-\d.*\.tgz$/),
  findTarball(tarballs, /^cms-lab-directus-\d.*\.tgz$/),
  findTarball(tarballs, /^cms-lab-next-\d.*\.tgz$/),
  findTarball(tarballs, /^cms-lab-prismic-\d.*\.tgz$/),
  findTarball(tarballs, /^cms-lab-reporter-\d.*\.tgz$/),
  findTarball(tarballs, /^cms-lab-strapi-\d.*\.tgz$/),
  findTarball(tarballs, /^cms-lab-wordpress-\d.*\.tgz$/),
  findTarball(tarballs, /^cms-lab-cli-\d.*\.tgz$/),
].map((file) => join(packDir, file));

await writeFile(
  join(appDir, "package.json"),
  `${JSON.stringify(
    {
      private: true,
      type: "module",
      dependencies: {
        next: "^15.0.0",
      },
    },
    null,
    2,
  )}\n`,
);

await run(npm, ["install", "--silent", ...installTarballs], { cwd: appDir });

const bin = join(
  appDir,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "cms-lab.cmd" : "cms-lab",
);

await run(bin, ["--version"], { cwd: appDir });
await run(bin, ["explain", "CMS-ROUTE-404"], { cwd: appDir });

if (isLive) {
  await writeFile(join(appDir, "cms-lab.config.ts"), liveConfig());
  await run(bin, ["doctor", "--timeout", "15000", "--retries", "2"], {
    cwd: appDir,
  });
  await run(
    bin,
    [
      "scan",
      "--ci",
      "--only",
      "routes,fields",
      "--timeout",
      "15000",
      "--retries",
      "2",
      "--report",
      "--fail-on",
      "error",
    ],
    { cwd: appDir },
  );
} else {
  await run(
    bin,
    [
      "init",
      "--repository",
      "nextjs-starter-prismic-blog",
      "--url",
      "https://nextjs-starter-prismic-blog.vercel.app",
    ],
    { cwd: appDir },
  );
}

console.log(`pack smoke passed in ${workspace}`);

function findTarball(files, pattern) {
  const file = files.find((candidate) => pattern.test(candidate));
  if (!file) {
    throw new Error(`No tarball matched ${pattern}`);
  }

  return file;
}

function run(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    console.log(`$ ${[command, ...args].join(" ")}`);
    const child = spawn(command, args, {
      cwd: options.cwd ?? rootDir,
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", rejectRun);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }

      rejectRun(
        new Error(
          signal
            ? `${command} ${args.join(" ")} exited with signal ${signal}`
            : `${command} ${args.join(" ")} exited with code ${code}`,
        ),
      );
    });
  });
}

function liveConfig() {
  return `import { defineConfig } from "@cms-lab/core";

export default defineConfig({
  site: {
    url:
      process.env.CMS_LAB_LIVE_SITE_URL ??
      "https://nextjs-starter-prismic-blog.vercel.app",
  },
  framework: { type: "next", router: "app" },
  cms: {
    provider: "prismic",
    repositoryName:
      process.env.CMS_LAB_LIVE_PRISMIC_REPOSITORY ??
      "nextjs-starter-prismic-blog",
    accessToken: process.env.PRISMIC_ACCESS_TOKEN,
  },
  routes: [
    { type: "page", pattern: "/:uid", getPath: (doc) => "/" + doc.uid },
    {
      type: "article",
      pattern: "/articles/:uid",
      getPath: (doc) => "/articles/" + doc.uid,
    },
  ],
  checks: {
    fields: {
      required: [
        { type: "page", path: "title" },
        { type: "article", path: "title" },
      ],
    },
  },
});
`;
}
