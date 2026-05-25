import { spawn } from "node:child_process";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

test("GitHub Action metadata exposes the cms-lab scan wrapper", async () => {
  const action = await readFile(resolve("action.yml"), "utf8");
  const runner = await readFile(resolve("scripts/github-action.sh"), "utf8");

  expect(action).toContain("name: cms-lab");
  expect(action).toContain("using: composite");
  expect(action).toContain("node-version: 24");
  expect(action).toContain("scripts/github-action.sh");
  expect(action).toContain("version:");
  expect(action).toContain("config:");
  expect(action).toContain("fail-on:");
  expect(action).toContain("report-path:");
  expect(action).toContain("summary-path:");
  expect(action).toContain("junit-path:");
  expect(runner).toContain("npx");
  expect(runner).toContain("@cms-lab/cli@${CMS_LAB_VERSION}");
  expect(runner).toContain("scan");
  expect(runner).toContain("--ci");
  expect(runner).toContain("report-path=");
});

test("publish workflow is prepared for npm Trusted Publishing", async () => {
  const workflow = await readFile(
    resolve(".github/workflows/publish.yml"),
    "utf8",
  );

  expect(workflow).toContain("id-token: write");
  expect(workflow).toContain("environment: npm");
  expect(workflow).not.toContain("NPM_TOKEN");
  expect(workflow).not.toContain("actions/cache");
});

test("GitHub Action runner builds a cms-lab scan command", async () => {
  const tmp = await mkdtemp(join(tmpdir(), "cms-lab-action-"));
  const argsFile = join(tmp, "args.txt");
  const outputFile = join(tmp, "github-output.txt");
  const fakeNpx = join(tmp, "npx");

  await writeFile(
    fakeNpx,
    `#!/usr/bin/env bash\nprintf '%s\\n' "$@" > "$CMS_LAB_NPX_ARGS_FILE"\n`,
  );
  await chmod(fakeNpx, 0o755);

  await run("bash", ["scripts/github-action.sh"], {
    ...process.env,
    PATH: `${tmp}:${process.env.PATH ?? ""}`,
    GITHUB_OUTPUT: outputFile,
    CMS_LAB_NPX_ARGS_FILE: argsFile,
    CMS_LAB_VERSION: "1.0.7",
    CMS_LAB_CONFIG: "cms-lab.config.ts",
    CMS_LAB_URL: "http://localhost:3000",
    CMS_LAB_REPORT: "true",
    CMS_LAB_REPORT_PATH: ".cms-lab/report.html",
    CMS_LAB_MARKDOWN: "true",
    CMS_LAB_MARKDOWN_PATH: ".cms-lab/summary.md",
    CMS_LAB_JUNIT: "true",
    CMS_LAB_JUNIT_PATH: ".cms-lab/junit.xml",
    CMS_LAB_FAIL_ON: "warning",
    CMS_LAB_ONLY: "routes,fields",
    CMS_LAB_SKIP: "seo",
    CMS_LAB_TYPE: "page",
    CMS_LAB_TIMEOUT: "15000",
    CMS_LAB_RETRIES: "2",
    CMS_LAB_CONCURRENCY: "4",
    CMS_LAB_STRICT: "true",
    CMS_LAB_MAX_WARNINGS: "0",
    CMS_LAB_MAX_INFO: "0",
  });

  const args = (await readFile(argsFile, "utf8")).trim().split("\n");
  const outputs = await readFile(outputFile, "utf8");

  expect(args).toEqual([
    "-y",
    "@cms-lab/cli@1.0.7",
    "scan",
    "--ci",
    "--config",
    "cms-lab.config.ts",
    "--url",
    "http://localhost:3000",
    "--fail-on",
    "warning",
    "--only",
    "routes,fields",
    "--skip",
    "seo",
    "--type",
    "page",
    "--timeout",
    "15000",
    "--retries",
    "2",
    "--concurrency",
    "4",
    "--max-warnings",
    "0",
    "--max-info",
    "0",
    "--report",
    ".cms-lab/report.html",
    "--markdown",
    ".cms-lab/summary.md",
    "--junit",
    ".cms-lab/junit.xml",
    "--strict",
  ]);
  expect(outputs).toContain("report-path=");
  expect(outputs).toContain("summary-path=");
  expect(outputs).toContain("junit-path=");
});

function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<void>((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: resolve("."),
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", rejectRun);
    child.on("exit", (code) => {
      if (code === 0) {
        resolveRun();
        return;
      }

      rejectRun(
        new Error(`${command} ${args.join(" ")} exited ${code}: ${stderr}`),
      );
    });
  });
}
