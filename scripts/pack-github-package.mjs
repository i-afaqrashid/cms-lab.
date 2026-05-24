#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultOutputDir = join(rootDir, ".release-github-package");

export function createGitHubPackageManifest(rootPackage) {
  if (!rootPackage.version) {
    throw new Error("Root package version is required.");
  }

  return {
    name: "@i-afaqrashid/cms-lab",
    version: rootPackage.version,
    description: "GitHub Packages mirror for cms-lab.",
    type: "module",
    license: "MIT",
    repository: rootPackage.repository ?? {
      type: "git",
      url: "git+https://github.com/i-afaqrashid/cms-lab.git",
    },
    homepage: "https://cmslab.afaqrashid.com",
    bugs: {
      url: "https://github.com/i-afaqrashid/cms-lab/issues",
    },
    publishConfig: {
      registry: "https://npm.pkg.github.com",
    },
    bin: {
      "cms-lab": "./bin/cms-lab.js",
    },
    files: ["bin", "README.md"],
    dependencies: {
      "@cms-lab/cli": rootPackage.version,
    },
  };
}

export function createGitHubPackageBin() {
  return `#!/usr/bin/env node
import { runCli } from "@cms-lab/cli";

process.exitCode = await runCli(process.argv.slice(2));
`;
}

export function createGitHubPackageReadme(version) {
  return `# @i-afaqrashid/cms-lab

GitHub Packages mirror for cms-lab ${version}.

The canonical public npm package is \`@cms-lab/cli\`:

\`\`\`sh
npx @cms-lab/cli scan
\`\`\`

This package exists so the GitHub repository is linked to a GitHub Packages npm
package. Its \`cms-lab\` binary delegates to \`@cms-lab/cli\`.
`;
}

export async function prepareGitHubPackage({
  outputDir = defaultOutputDir,
  sourceRootDir = rootDir,
} = {}) {
  const packageDir = join(outputDir, "package");
  const tarballDir = join(outputDir, "tarballs");
  const binDir = join(packageDir, "bin");
  const rootPackage = JSON.parse(
    await readFile(join(sourceRootDir, "package.json"), "utf8"),
  );
  const manifest = createGitHubPackageManifest(rootPackage);

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(binDir, { recursive: true });
  await mkdir(tarballDir, { recursive: true });
  await writeFile(
    join(packageDir, "package.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await writeFile(
    join(packageDir, "README.md"),
    createGitHubPackageReadme(manifest.version),
  );
  await writeFile(join(binDir, "cms-lab.js"), createGitHubPackageBin());
  await chmod(join(binDir, "cms-lab.js"), 0o755);

  return { manifest, packageDir, tarballDir };
}

export async function packGitHubPackage(options = {}) {
  const prepared = await prepareGitHubPackage(options);

  execFileSync(
    "npm",
    ["pack", prepared.packageDir, "--pack-destination", prepared.tarballDir],
    {
      stdio: "inherit",
    },
  );

  return prepared;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outputDir = process.argv[2]
    ? resolve(process.cwd(), process.argv[2])
    : defaultOutputDir;

  await packGitHubPackage({ outputDir });
}
