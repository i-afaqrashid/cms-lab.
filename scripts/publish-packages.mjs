#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const packageOrder = [
  "@cms-lab/core",
  "@cms-lab/directus",
  "@cms-lab/next",
  "@cms-lab/prismic",
  "@cms-lab/reporter",
  "@cms-lab/strapi",
  "@cms-lab/wordpress",
  "cms-lab",
];

const args = process.argv.slice(2);
const tarballDir = args.find((arg) => !arg.startsWith("--"));
const dryRun = process.argv.includes("--dry-run");

if (!tarballDir || !existsSync(tarballDir)) {
  console.error("Usage: node scripts/publish-packages.mjs <tarball-dir>");
  process.exit(1);
}

const tarballs = readdirSync(tarballDir)
  .filter((file) => file.endsWith(".tgz"))
  .map((file) => join(tarballDir, file));

const packages = tarballs.map((tarball) => ({
  tarball,
  packageJson: readPackageJson(tarball),
}));

for (const name of packageOrder) {
  if (!packages.some((entry) => entry.packageJson.name === name)) {
    fail(`Missing packed tarball for ${name}.`);
  }
}

for (const entry of packages) {
  const { name, version } = entry.packageJson;
  if (!packageOrder.includes(name)) {
    fail(`Unexpected package tarball: ${name}@${version}.`);
  }

  if (awaitPackageExists(name, version)) {
    fail(`${name}@${version} already exists on npm. Refusing to republish.`);
  }
}

for (const name of packageOrder) {
  const entry = packages.find(
    (candidate) => candidate.packageJson.name === name,
  );
  const args = ["publish", entry.tarball, "--access", "public", "--provenance"];

  if (dryRun) {
    args.push("--dry-run");
  }

  console.log(`Publishing ${name}@${entry.packageJson.version}`);
  run("npm", args);
}

function readPackageJson(tarball) {
  const output = execFileSync(
    "tar",
    ["-xOf", tarball, "package/package.json"],
    {
      encoding: "utf8",
    },
  );

  return JSON.parse(output);
}

function awaitPackageExists(name, version) {
  const result = spawnSync("npm", ["view", `${name}@${version}`, "version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status === 0) {
    return true;
  }

  if (result.stderr.includes("E404") || result.stdout.includes("E404")) {
    return false;
  }

  process.stderr.write(result.stderr);
  fail(`Could not check npm registry for ${name}@${version}.`);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
