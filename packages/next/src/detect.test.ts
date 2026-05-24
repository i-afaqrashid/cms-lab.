import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectNextProject } from "@cms-lab/next";

test("detectNextProject detects an App Router project at app/", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-next-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );

  const project = await detectNextProject(cwd);

  expect(project).toEqual({
    framework: "next",
    router: "app",
    rootDir: cwd,
    appDir: join(cwd, "app"),
  });
});

test("detectNextProject reports pages router when no app directory exists", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-next-"));
  await mkdir(join(cwd, "pages"), { recursive: true });
  await writeFile(join(cwd, "next.config.mjs"), "export default {}");

  const project = await detectNextProject(cwd);

  expect(project.router).toBe("pages");
  expect(project.pagesDir).toBe(join(cwd, "pages"));
});
