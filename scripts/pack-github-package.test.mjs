import { describe, expect, it } from "vitest";

import {
  createGitHubPackageBin,
  createGitHubPackageManifest,
} from "./pack-github-package.mjs";

describe("GitHub Packages alias package", () => {
  it("uses the GitHub account scope and points back to the repository", () => {
    const manifest = createGitHubPackageManifest({
      description: "Catch CMS bugs before deploy.",
      repository: {
        type: "git",
        url: "git+https://github.com/i-afaqrashid/cms-lab.git",
      },
      version: "1.2.3",
    });

    expect(manifest).toMatchObject({
      name: "@i-afaqrashid/cms-lab",
      version: "1.2.3",
      description: "GitHub Packages mirror for cms-lab.",
      type: "module",
      license: "MIT",
      bin: { "cms-lab": "./bin/cms-lab.js" },
      dependencies: { "@cms-lab/cli": "1.2.3" },
      publishConfig: { registry: "https://npm.pkg.github.com" },
      repository: {
        type: "git",
        url: "git+https://github.com/i-afaqrashid/cms-lab.git",
      },
    });
  });

  it("creates a bin wrapper that delegates to the canonical CLI package", () => {
    expect(createGitHubPackageBin()).toContain(
      'import { runCli } from "@cms-lab/cli";',
    );
    expect(createGitHubPackageBin()).toContain(
      "process.exitCode = await runCli(process.argv.slice(2));",
    );
  });
});
