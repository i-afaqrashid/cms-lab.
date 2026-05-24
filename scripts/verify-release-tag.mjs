#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoUrl = "git+https://github.com/i-afaqrashid/cms-lab.git";
const tagName = normalizeTag(
  process.argv[2] ?? process.env.GITHUB_REF_NAME ?? process.env.GITHUB_REF,
);

if (!tagName) {
  fail("Release tag is missing. Run on a tag such as v1.0.3.");
}

const match = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(tagName);

if (!match) {
  fail(`Release tag "${tagName}" must match vX.Y.Z, for example v1.0.3.`);
}

const version = tagName.slice(1);
const rootPackage = readJson("package.json");
const publishablePackages = readdirSync("packages", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => readJson(join("packages", entry.name, "package.json")))
  .sort((left, right) => left.name.localeCompare(right.name));

const allPackages = [rootPackage, ...publishablePackages];

for (const packageJson of allPackages) {
  if (packageJson.version !== version) {
    fail(
      `${packageJson.name} is version ${packageJson.version}, but tag ${tagName} expects ${version}.`,
    );
  }
}

for (const packageJson of publishablePackages) {
  if (packageJson.private) {
    fail(`${packageJson.name} is marked private and cannot be published.`);
  }

  if (packageJson.publishConfig?.access !== "public") {
    fail(`${packageJson.name} must set publishConfig.access to "public".`);
  }

  if (packageJson.repository?.url !== repoUrl) {
    fail(`${packageJson.name} repository.url must be ${repoUrl}.`);
  }
}

const cliSource = readFileSync("packages/cli/src/index.ts", "utf8");
if (!cliSource.includes(`.version("${version}")`)) {
  fail(`packages/cli/src/index.ts must expose CLI version ${version}.`);
}

console.log(
  `Release tag ${tagName} matches ${publishablePackages.length} publishable packages.`,
);

function normalizeTag(value) {
  if (!value) {
    return undefined;
  }

  return value.replace(/^refs\/tags\//, "");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
