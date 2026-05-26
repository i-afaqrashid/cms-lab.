import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { exampleProjects, stackBlitzStarterUrl } from "./example-links";

const stackBlitzBase =
  "https://stackblitz.com/fork/github/i-afaqrashid/cms-lab/tree/main/examples";

describe("public runnable examples", () => {
  test("defines StackBlitz links for repo-backed examples", () => {
    expect(exampleProjects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "examples/broken-prismic-demo",
          title: "Broken Prismic demo",
          url: expect.stringContaining(`${stackBlitzBase}/broken-prismic-demo`),
        }),
        expect.objectContaining({
          path: "examples/next-prismic",
          title: "Next Prismic config",
          url: expect.stringContaining(`${stackBlitzBase}/next-prismic`),
        }),
      ]),
    );

    expect(stackBlitzStarterUrl).toContain(
      `${stackBlitzBase}/broken-prismic-demo`,
    );
  });

  test("documents every runnable example in docs and READMEs", () => {
    const rootReadme = readFileSync("README.md", "utf8");
    const examplesReadme = readFileSync("examples/README.md", "utf8");
    const docsExamples = readFileSync(
      "apps/site/app/docs/examples/page.tsx",
      "utf8",
    );
    const newPage = readFileSync("apps/site/app/new/page.tsx", "utf8");

    expect(docsExamples).toContain('active="/docs/examples"');
    expect(docsExamples).toContain("exampleProjects.map");
    expect(docsExamples).toContain("href={example.url}");
    expect(docsExamples).toContain("Run in StackBlitz");
    expect(newPage).toContain("stackBlitzStarterUrl");
    expect(newPage).toContain('httpEquiv="refresh"');
    expect(newPage).toContain("window.location.replace");

    for (const example of exampleProjects) {
      const directory = example.path;
      expect(existsSync(directory)).toBe(true);

      const manifest = JSON.parse(
        readFileSync(join(directory, "package.json"), "utf8"),
      );
      expect(manifest.private).toBe(true);
      expect(manifest.devDependencies["@cms-lab/cli"]).toBe("latest");
      expect(manifest.devDependencies["@cms-lab/core"]).toBe("latest");
      expect(JSON.stringify(manifest)).not.toMatch(
        /workspace:|file:|link:|portal:/,
      );
      expect(manifest.scripts.doctor).toContain("cms-lab doctor");
      expect(manifest.scripts.scan).toContain("cms-lab scan");

      expect(rootReadme).toContain(example.url);
      expect(examplesReadme).toContain(example.url);

      const readme = readFileSync(join(directory, "README.md"), "utf8");
      expect(readme).toContain("Run in StackBlitz");
      expect(readme).toContain(example.url);
    }
  });
});
