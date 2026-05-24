import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CmsFetchError } from "@cms-lab/core";
import { runCli } from "@cms-lab/cli";

test("runCli prints JSON scan results and returns 1 when errors exist", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(["scan", "--config", configPath, "--json"], {
    cwd,
    stdout: (text) => {
      stdout += text;
    },
    stderr: (text) => {
      stderr += text;
    },
    fetchPrismicDocuments: async () => [
      {
        id: "doc-1",
        type: "page",
        uid: "missing",
        status: "published",
        data: { meta_title: "Missing", meta_description: "Missing page" },
      },
    ],
    fetch: async (url) => {
      if (String(url) === "http://localhost:3000/") {
        return new Response("ok");
      }

      return new Response("missing", { status: 404 });
    },
  });

  const result = JSON.parse(stdout);

  expect(exitCode).toBe(1);
  expect(stderr).toBe("");
  expect(result.summary.errors).toBe(1);
  expect(result.diagnostics[0].code).toBe("CMS-ROUTE-404");
  expect(result.project.rootDir).toBe(
    "[redacted: pass --include-sensitive-output to emit raw project paths]",
  );
  expect(result.project.appDir).toBe(
    "[redacted: pass --include-sensitive-output to emit raw project paths]",
  );
  expect(result.documents[0].data).toBe(
    "[redacted: pass --include-sensitive-output to emit raw CMS data]",
  );
  expect(result.documents[0].uid).toBeUndefined();
  expect(stdout).not.toContain("Missing page");
});

test("runCli can opt in to raw document data in JSON output", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stdout = "";
  const exitCode = await runCli(
    ["scan", "--config", configPath, "--json", "--include-sensitive-output"],
    {
      cwd,
      stdout: (text) => {
        stdout += text;
      },
      stderr: () => {},
      fetchPrismicDocuments: async () => [
        {
          id: "doc-1",
          type: "page",
          uid: "about",
          status: "published",
          data: {
            meta_title: "About",
            meta_description: "Private person profile",
          },
        },
      ],
      fetch: async () => new Response("ok"),
    },
  );

  const result = JSON.parse(stdout);

  expect(exitCode).toBe(0);
  expect(result.project.rootDir).toBe(cwd);
  expect(result.documents[0].data.meta_description).toBe(
    "Private person profile",
  );
});

test("runCli scans Next.js Pages Router projects", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "pages"), { recursive: true });
  await writeFile(join(cwd, "next.config.mjs"), "export default {}");
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'pages' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stdout = "";
  const exitCode = await runCli(["scan", "--config", configPath, "--json"], {
    cwd,
    stdout: (text) => {
      stdout += text;
    },
    stderr: () => {},
    fetchPrismicDocuments: async () => [
      {
        id: "doc-1",
        type: "page",
        uid: "about",
        status: "published",
        data: { meta_title: "About", meta_description: "About page" },
      },
    ],
    fetch: async () => new Response("ok"),
  });

  const result = JSON.parse(stdout);

  expect(exitCode).toBe(0);
  expect(result.project.router).toBe("pages");
  expect(result.project.pagesDir).toBe(
    "[redacted: pass --include-sensitive-output to emit raw project paths]",
  );
  expect(result.summary).toEqual({ errors: 0, warnings: 0, info: 0 });
});

test("runCli agent-context writes safe AI agent handoff files", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(join(cwd, "next.config.mjs"), "export default {}");
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'https://preview.example.com?secret=top-secret' },
        framework: { type: 'next', router: 'app' },
        cms: {
          provider: 'prismic',
          repositoryName: 'demo-repo',
          accessToken: 'top-secret-token',
        },
        routes: [
          { type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid },
          { type: 'article', pattern: '/articles/:uid', getPath: (doc) => '/articles/' + doc.uid },
        ],
        checks: {
          routes: true,
          seo: true,
          a11y: { imgAlt: true },
          fields: { required: [{ type: 'page', path: 'title' }] },
        },
      })
    `,
  );

  let stdout = "";
  const exitCode = await runCli(["agent-context", "--config", configPath], {
    cwd,
    stdout: (text) => {
      stdout += text;
    },
    stderr: () => {},
  });

  const agents = await readFile(join(cwd, "AGENTS.md"), "utf8");
  const context = await readFile(
    join(cwd, ".cms-lab/agent-context.md"),
    "utf8",
  );
  const prompt = await readFile(join(cwd, ".cms-lab/agent-prompt.md"), "utf8");
  const combined = [agents, context, prompt, stdout].join("\n");

  expect(exitCode).toBe(0);
  expect(stdout).toContain("created AGENTS.md");
  expect(stdout).toContain("created .cms-lab/agent-context.md");
  expect(stdout).toContain("created .cms-lab/agent-prompt.md");
  expect(agents).toContain("Read `.cms-lab/agent-context.md`");
  expect(context).toContain("Framework: Next.js App Router");
  expect(context).toContain("CMS provider: prismic");
  expect(context).toContain("Repository: demo-repo");
  expect(context).toContain("page -> /:uid");
  expect(context).toContain("article -> /articles/:uid");
  expect(prompt).toContain("Claude Code");
  expect(prompt).toContain("Codex");
  expect(prompt).toContain("Gemini CLI");
  expect(prompt).toContain("Antigravity");
  expect(prompt).toContain("OpenCode");
  expect(combined).toContain("https://github.com/i-afaqrashid/cms-lab");
  expect(combined).toContain("https://www.npmjs.com/package/@cms-lab/cli");
  expect(combined).toContain("https://cmslab.afaqrashid.com/docs");
  expect(combined).toContain("npx @cms-lab/cli@latest doctor");
  expect(combined).not.toContain(cwd);
  expect(combined).not.toContain("preview.example.com");
  expect(combined).not.toContain("top-secret");
  expect(combined).not.toContain("top-secret-token");
});

test("runCli agent-context refuses to overwrite existing files without force", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(join(cwd, "next.config.mjs"), "export default {}");
  await writeFile(join(cwd, "AGENTS.md"), "existing team instructions");
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stderr = "";
  const exitCode = await runCli(["agent-context", "--config", configPath], {
    cwd,
    stdout: () => {},
    stderr: (text) => {
      stderr += text;
    },
  });

  expect(exitCode).toBe(2);
  expect(stderr).toContain("AGENTS.md already exists");
  await expect(
    readFile(join(cwd, ".cms-lab/agent-context.md"), "utf8"),
  ).rejects.toThrow();
  expect(await readFile(join(cwd, "AGENTS.md"), "utf8")).toBe(
    "existing team instructions",
  );
});

test("runCli agent-context overwrites generated files with force", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(join(cwd, "next.config.mjs"), "export default {}");
  await mkdir(join(cwd, ".cms-lab"), { recursive: true });
  await writeFile(join(cwd, "AGENTS.md"), "old agents");
  await writeFile(join(cwd, ".cms-lab/agent-context.md"), "old context");
  await writeFile(join(cwd, ".cms-lab/agent-prompt.md"), "old prompt");
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'strapi', url: 'http://localhost:1337', collections: [{ type: 'page', endpoint: 'pages' }] },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  const exitCode = await runCli(
    ["agent-context", "--config", configPath, "--force"],
    {
      cwd,
      stdout: () => {},
      stderr: () => {},
    },
  );

  expect(exitCode).toBe(0);
  expect(await readFile(join(cwd, "AGENTS.md"), "utf8")).toContain(
    "cms-lab agent handoff",
  );
  expect(
    await readFile(join(cwd, ".cms-lab/agent-context.md"), "utf8"),
  ).toContain("CMS provider: strapi");
  expect(
    await readFile(join(cwd, ".cms-lab/agent-prompt.md"), "utf8"),
  ).toContain("npx @cms-lab/cli@latest scan");
});

test("runCli agent-context supports tool-specific presets", async () => {
  const cases = [
    {
      preset: "codex",
      expected: [
        "AGENTS.md",
        ".cms-lab/agent-context.md",
        ".cms-lab/agent-prompt.md",
      ],
      unexpected: ["CLAUDE.md", "GEMINI.md", ".github/copilot-instructions.md"],
    },
    {
      preset: "claude",
      expected: [
        "CLAUDE.md",
        ".cms-lab/agent-context.md",
        ".cms-lab/agent-prompt.md",
      ],
      unexpected: ["AGENTS.md", "GEMINI.md", ".github/copilot-instructions.md"],
    },
    {
      preset: "gemini",
      expected: [
        "GEMINI.md",
        ".cms-lab/agent-context.md",
        ".cms-lab/agent-prompt.md",
      ],
      unexpected: ["AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md"],
    },
    {
      preset: "copilot",
      expected: [
        ".github/copilot-instructions.md",
        ".github/prompts/cms-lab-fix.prompt.md",
        ".cms-lab/agent-context.md",
        ".cms-lab/agent-prompt.md",
      ],
      unexpected: ["AGENTS.md", "CLAUDE.md", "GEMINI.md"],
    },
    {
      preset: "all",
      expected: [
        "AGENTS.md",
        "CLAUDE.md",
        "GEMINI.md",
        ".github/copilot-instructions.md",
        ".github/prompts/cms-lab-fix.prompt.md",
        ".cms-lab/agent-context.md",
        ".cms-lab/agent-prompt.md",
      ],
      unexpected: [],
    },
  ];

  for (const testCase of cases) {
    const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
    await mkdir(join(cwd, "pages"), { recursive: true });
    await writeFile(join(cwd, "next.config.mjs"), "export default {}");
    const configPath = join(cwd, "cms-lab.config.ts");
    await writeFile(
      configPath,
      `
        import { defineConfig } from '@cms-lab/core'
        export default defineConfig({
          site: { url: 'http://localhost:3000' },
          framework: { type: 'next', router: 'pages' },
          cms: { provider: 'directus', url: 'http://localhost:8055', collections: [{ type: 'page', collection: 'pages' }] },
          routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
        })
      `,
    );

    let stdout = "";
    const exitCode = await runCli(
      ["agent-context", "--config", configPath, "--preset", testCase.preset],
      {
        cwd,
        stdout: (text) => {
          stdout += text;
        },
        stderr: () => {},
      },
    );

    expect(exitCode, testCase.preset).toBe(0);

    for (const file of testCase.expected) {
      expect(stdout, `${testCase.preset}:${file}`).toContain(`created ${file}`);
      expect(await readFile(join(cwd, file), "utf8")).toContain("cms-lab");
    }

    for (const file of testCase.unexpected) {
      await expect(
        readFile(join(cwd, file), "utf8"),
        `${testCase.preset}:${file}`,
      ).rejects.toThrow();
    }

    if (testCase.preset === "claude" || testCase.preset === "all") {
      expect(await readFile(join(cwd, "CLAUDE.md"), "utf8")).toContain(
        "@.cms-lab/agent-context.md",
      );
    }

    if (testCase.preset === "gemini" || testCase.preset === "all") {
      expect(await readFile(join(cwd, "GEMINI.md"), "utf8")).toContain(
        "@.cms-lab/agent-context.md",
      );
    }

    if (testCase.preset === "copilot" || testCase.preset === "all") {
      expect(
        await readFile(
          join(cwd, ".github/prompts/cms-lab-fix.prompt.md"),
          "utf8",
        ),
      ).toContain("cms-lab diagnostics");
    }
  }
});

test("runCli agent-context rejects unknown presets", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(join(cwd, "next.config.mjs"), "export default {}");
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stderr = "";
  const exitCode = await runCli(
    ["agent-context", "--config", configPath, "--preset", "cursor"],
    {
      cwd,
      stdout: () => {},
      stderr: (text) => {
        stderr += text;
      },
    },
  );

  expect(exitCode).toBe(2);
  expect(stderr).toContain(
    "--preset must be one of: generic, codex, claude, gemini, copilot, all",
  );
});

test("runCli pretty output respects --no-color and suggests the next explain command", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stdout = "";
  const exitCode = await runCli(
    ["scan", "--config", configPath, "--no-color"],
    {
      cwd,
      isStdoutTTY: true,
      stdout: (text) => {
        stdout += text;
      },
      stderr: () => {},
      fetchPrismicDocuments: async () => [
        {
          id: "doc-1",
          type: "page",
          uid: "missing",
          status: "published",
          data: { meta_title: "Missing", meta_description: "Missing page" },
        },
      ],
      fetch: async (url) => {
        if (String(url) === "http://localhost:3000/") {
          return new Response("ok");
        }

        return new Response("missing", { status: 404 });
      },
    },
  );

  expect(exitCode).toBe(1);
  expect(stdout).toContain("scan failed - 1 error");
  expect(stdout).toContain("next\n  cms-lab explain CMS-ROUTE-404");
  expect(stdout).not.toContain("\u001b[");
});

test("runCli writes debug logs to stderr without corrupting JSON stdout", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: {
          provider: 'prismic',
          repositoryName: 'demo',
          accessToken: 'secret-token',
        },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(
    ["scan", "--config", configPath, "--json", "--debug", "--verbose", "2"],
    {
      cwd,
      stdout: (text) => {
        stdout += text;
      },
      stderr: (text) => {
        stderr += text;
      },
      fetchPrismicDocuments: async () => [
        {
          id: "page-1",
          type: "page",
          uid: "about",
          status: "published",
          data: { meta_title: "About", meta_description: "About page" },
        },
      ],
      fetch: async () => new Response("ok"),
    },
  );

  const result = JSON.parse(stdout);

  expect(exitCode).toBe(0);
  expect(result.summary).toEqual({ errors: 0, warnings: 0, info: 0 });
  expect(stderr).toContain("[cms-lab:debug] scan config");
  expect(stderr).toContain("[cms-lab:debug] scan cms prismic repository=demo");
  expect(stderr).toContain("[cms-lab:debug] scan documents 1");
  expect(stderr).toContain("[cms-lab:debug] scan timing");
  expect(stderr).not.toContain("secret-token");
});

test("runCli redacts tokens from error output", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stderr = "";
  const exitCode = await runCli(["scan", "--config", configPath], {
    cwd,
    stdout: () => {},
    stderr: (text) => {
      stderr += text;
    },
    fetchPrismicDocuments: async () => {
      throw new CmsFetchError(
        "failed https://user:pass@example.com/api?access_token=secret-token&token=other-secret Bearer header-secret",
      );
    },
    fetch: async () => new Response("ok"),
  });

  expect(exitCode).toBe(3);
  expect(stderr).toContain("access_token=[redacted]");
  expect(stderr).toContain("token=[redacted]");
  expect(stderr).toContain("Bearer [redacted]");
  expect(stderr).toContain("https://[redacted]@example.com");
  expect(stderr).not.toContain("secret-token");
  expect(stderr).not.toContain("other-secret");
  expect(stderr).not.toContain("header-secret");
  expect(stderr).not.toContain("user:pass");
});

test("runCli rejects invalid verbosity levels", async () => {
  let stderr = "";
  const exitCode = await runCli(["scan", "--verbose", "loud"], {
    cwd: await mkdtemp(join(tmpdir(), "cms-lab-cli-")),
    stdout: () => {},
    stderr: (text) => {
      stderr += text;
    },
  });

  expect(exitCode).toBe(2);
  expect(stderr).toContain("--verbose must be one of: 0, 1, 2, 3");
});

test("runCli maps config errors to exit code 2", async () => {
  let stderr = "";
  const exitCode = await runCli(["scan", "--config", "missing.config.ts"], {
    cwd: await mkdtemp(join(tmpdir(), "cms-lab-cli-")),
    stdout: () => {},
    stderr: (text) => {
      stderr += text;
    },
  });

  expect(exitCode).toBe(2);
  expect(stderr).toContain("Config error");
});

test("runCli maps CMS fetch failures to exit code 3", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stderr = "";
  const exitCode = await runCli(["scan", "--config", configPath], {
    cwd,
    stdout: () => {},
    stderr: (text) => {
      stderr += text;
    },
    fetchPrismicDocuments: async () => {
      throw new CmsFetchError("Prismic request failed with HTTP 401");
    },
  });

  expect(exitCode).toBe(3);
  expect(stderr).toContain("CMS error");
  expect(stderr).toContain("HTTP 401");
});

test("runCli maps site connectivity failures to exit code 4", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stderr = "";
  const exitCode = await runCli(["scan", "--config", configPath], {
    cwd,
    stdout: () => {},
    stderr: (text) => {
      stderr += text;
    },
    fetchPrismicDocuments: async () => [
      {
        id: "page-1",
        type: "page",
        uid: "about",
        status: "published",
        data: {},
      },
    ],
    fetch: async () => {
      throw new Error("connection refused");
    },
  });

  expect(exitCode).toBe(4);
  expect(stderr).toContain("Site error");
  expect(stderr).toContain("connection refused");
});

test("runCli supports version output", async () => {
  let stdout = "";
  const exitCode = await runCli(["--version"], {
    stdout: (text) => {
      stdout += text;
    },
    stderr: () => {},
  });

  expect(exitCode).toBe(0);
  expect(stdout).toContain("1.0.4");
});

test("runCli scan help includes examples and color controls", async () => {
  let stdout = "";
  const exitCode = await runCli(["scan", "--help"], {
    stdout: (text) => {
      stdout += text;
    },
    stderr: () => {},
  });

  expect(exitCode).toBe(0);
  expect(stdout).toContain("Examples:");
  expect(stdout).toContain("cms-lab scan --ci --report");
  expect(stdout).toContain("--no-color");
});

test("runCli passes scan filters and timeout options", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [
          { type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid },
          { type: 'blog_post', pattern: '/blog/:uid', getPath: (doc) => '/blog/' + doc.uid },
        ],
      })
    `,
  );

  let stdout = "";
  const exitCode = await runCli(
    [
      "scan",
      "--config",
      configPath,
      "--json",
      "--type",
      "page",
      "--only",
      "routes",
      "--timeout",
      "250",
    ],
    {
      cwd,
      stdout: (text) => {
        stdout += text;
      },
      stderr: () => {},
      fetchPrismicDocuments: async () => [
        {
          id: "page-1",
          type: "page",
          uid: "about",
          status: "published",
          data: { meta_title: "", meta_description: "" },
        },
        {
          id: "post-1",
          type: "blog_post",
          uid: "missing-post",
          status: "published",
          data: { meta_title: "", meta_description: "" },
        },
      ],
      fetch: async () => new Response("ok"),
    },
  );

  const result = JSON.parse(stdout);

  expect(exitCode).toBe(0);
  expect(
    result.documents.map((document: { id: string }) => document.id),
  ).toEqual(["page-1"]);
  expect(result.diagnostics).toEqual([]);
});

test("runCli can fail on warnings when requested", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stdout = "";
  const exitCode = await runCli(
    ["scan", "--config", configPath, "--fail-on", "warning"],
    {
      cwd,
      stdout: (text) => {
        stdout += text;
      },
      stderr: () => {},
      fetchPrismicDocuments: async () => [
        {
          id: "page-1",
          type: "page",
          uid: "about",
          status: "published",
          data: { meta_title: "", meta_description: "" },
        },
      ],
      fetch: async () => new Response("ok"),
    },
  );

  expect(exitCode).toBe(1);
  expect(stdout).toContain("scan failed");
  expect(stdout).toContain("1 warning");
});

test("runCli reports completed scans when fail-on never ignores errors", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stdout = "";
  const exitCode = await runCli(
    ["scan", "--config", configPath, "--fail-on", "never"],
    {
      cwd,
      stdout: (text) => {
        stdout += text;
      },
      stderr: () => {},
      fetchPrismicDocuments: async () => [
        {
          id: "page-1",
          type: "page",
          uid: "missing",
          status: "published",
          data: { meta_title: "Missing", meta_description: "Missing page" },
        },
      ],
      fetch: async (url) => {
        if (String(url) === "http://localhost:3000/") {
          return new Response("ok");
        }

        return new Response("missing", { status: 404 });
      },
    },
  );

  expect(exitCode).toBe(0);
  expect(stdout).toContain("errors   1");
  expect(stdout).toContain("scan completed");
  expect(stdout).toContain("--fail-on never");
  expect(stdout).not.toContain("scan failed");
});

test("runCli fails when warning budget is exceeded", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stdout = "";
  const exitCode = await runCli(
    ["scan", "--config", configPath, "--max-warnings", "0"],
    {
      cwd,
      stdout: (text) => {
        stdout += text;
      },
      stderr: () => {},
      fetchPrismicDocuments: async () => [
        {
          id: "page-1",
          type: "page",
          uid: "about",
          status: "published",
          data: { meta_title: "", meta_description: "" },
        },
      ],
      fetch: async () => new Response("ok"),
    },
  );

  expect(exitCode).toBe(1);
  expect(stdout).toContain("exceed --max-warnings 0");
});

test("runCli strict mode fails on info diagnostics", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stdout = "";
  const exitCode = await runCli(
    ["scan", "--config", configPath, "--strict", "--only", "routes"],
    {
      cwd,
      stdout: (text) => {
        stdout += text;
      },
      stderr: () => {},
      fetchPrismicDocuments: async () => [
        {
          id: "settings-1",
          type: "settings",
          status: "published",
          data: { meta_title: "Settings", meta_description: "Settings" },
        },
      ],
      fetch: async () => new Response("ok"),
    },
  );

  expect(exitCode).toBe(1);
  expect(stdout).toContain("1 info item exceed --max-info 0");
});

test("runCli diagnostic budgets still fail when fail-on never is set", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stdout = "";
  const exitCode = await runCli(
    [
      "scan",
      "--config",
      configPath,
      "--fail-on",
      "never",
      "--max-info",
      "0",
      "--only",
      "routes",
    ],
    {
      cwd,
      stdout: (text) => {
        stdout += text;
      },
      stderr: () => {},
      fetchPrismicDocuments: async () => [
        {
          id: "settings-1",
          type: "settings",
          status: "published",
          data: { meta_title: "Settings", meta_description: "Settings" },
        },
      ],
      fetch: async () => new Response("ok"),
    },
  );

  expect(exitCode).toBe(1);
  expect(stdout).toContain("1 info item exceed --max-info 0");
  expect(stdout).not.toContain("--fail-on never");
});

test("runCli rejects invalid diagnostic budgets", async () => {
  let stderr = "";
  const exitCode = await runCli(["scan", "--max-info", "loud"], {
    cwd: await mkdtemp(join(tmpdir(), "cms-lab-cli-")),
    stdout: () => {},
    stderr: (text) => {
      stderr += text;
    },
  });

  expect(exitCode).toBe(2);
  expect(stderr).toContain("--max-info must be a non-negative integer");
});

test("runCli rejects type filters that match no CMS documents", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stderr = "";
  const exitCode = await runCli(
    ["scan", "--config", configPath, "--type", "missing_type"],
    {
      cwd,
      stdout: () => {},
      stderr: (text) => {
        stderr += text;
      },
      fetchPrismicDocuments: async () => [
        {
          id: "page-1",
          type: "page",
          uid: "about",
          status: "published",
          data: { meta_title: "About", meta_description: "About page" },
        },
      ],
      fetch: async () => new Response("ok"),
    },
  );

  expect(exitCode).toBe(2);
  expect(stderr).toContain("No CMS documents matched --type");
});

test("runCli can write an HTML report without breaking JSON stdout", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  const reportPath = join(cwd, ".cms-lab", "report.html");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stdout = "";
  const exitCode = await runCli(
    ["scan", "--config", configPath, "--json", "--report", reportPath],
    {
      cwd,
      stdout: (text) => {
        stdout += text;
      },
      stderr: () => {},
      fetchPrismicDocuments: async () => [
        {
          id: "page-1",
          type: "page",
          uid: "about",
          status: "published",
          data: { meta_title: "About", meta_description: "About page" },
        },
      ],
      fetch: async () => new Response("ok"),
    },
  );

  expect(exitCode).toBe(0);
  expect(JSON.parse(stdout).summary.errors).toBe(0);
  expect(await readFile(reportPath, "utf8")).toContain("cms-lab report");
});

test("runCli can write Markdown and JUnit exports without breaking JSON stdout", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  const markdownPath = join(cwd, ".cms-lab", "summary.md");
  const junitPath = join(cwd, ".cms-lab", "junit.xml");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stdout = "";
  const exitCode = await runCli(
    [
      "scan",
      "--config",
      configPath,
      "--json",
      "--markdown",
      markdownPath,
      "--junit",
      junitPath,
    ],
    {
      cwd,
      stdout: (text) => {
        stdout += text;
      },
      stderr: () => {},
      fetchPrismicDocuments: async () => [
        {
          id: "page-1",
          type: "page",
          uid: "missing",
          status: "published",
          data: {
            meta_title: "Missing",
            meta_description: "Do not leak this CMS field",
          },
        },
      ],
      fetch: async (url) => {
        if (String(url) === "http://localhost:3000/") {
          return new Response("ok");
        }

        return new Response("missing", { status: 404 });
      },
    },
  );

  const markdown = await readFile(markdownPath, "utf8");
  const junit = await readFile(junitPath, "utf8");

  expect(exitCode).toBe(1);
  expect(JSON.parse(stdout).summary.errors).toBe(1);
  expect(markdown).toContain("# cms-lab scan failed");
  expect(markdown).toContain("| Errors | Warnings | Info | Documents |");
  expect(markdown).toContain("CMS-ROUTE-404");
  expect(markdown).not.toContain("Do not leak this CMS field");
  expect(junit).toContain('<testsuite name="cms-lab" tests="1" failures="1"');
  expect(junit).toContain('<testcase classname="cms-lab.routes"');
  expect(junit).toContain("CMS-ROUTE-404");
  expect(junit).not.toContain("Do not leak this CMS field");
});

test("runCli posts redacted Slack summaries when requested", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: {
          provider: 'prismic',
          repositoryName: 'demo',
          accessToken: 'secret-cms-token',
        },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let webhookBody = "";
  let stderr = "";
  const exitCode = await runCli(
    [
      "scan",
      "--config",
      configPath,
      "--slack-webhook",
      "https://hooks.slack.com/services/T000/B000/secret-webhook-token",
      "--notify-on",
      "diagnostics",
      "--debug",
      "--verbose",
      "2",
    ],
    {
      cwd,
      stdout: () => {},
      stderr: (text) => {
        stderr += text;
      },
      fetchPrismicDocuments: async () => [
        {
          id: "page-1",
          type: "page",
          uid: "missing",
          status: "published",
          data: {
            meta_title: "Missing",
            meta_description: "Private profile data",
          },
        },
      ],
      fetch: async (url, init) => {
        if (String(url).startsWith("https://hooks.slack.com/")) {
          webhookBody = String(init?.body ?? "");
          return new Response("ok");
        }

        if (String(url) === "http://localhost:3000/") {
          return new Response("ok");
        }

        return new Response("missing", { status: 404 });
      },
    },
  );

  const payload = JSON.parse(webhookBody);

  expect(exitCode).toBe(1);
  expect(payload.text).toContain("cms-lab scan failed");
  expect(payload.text).toContain("1 error");
  expect(payload.text).toContain("1 document");
  expect(payload.text).toContain("CMS-ROUTE-404");
  expect(webhookBody).not.toContain("Private profile data");
  expect(webhookBody).not.toContain("secret-cms-token");
  expect(webhookBody).not.toContain("secret-webhook-token");
  expect(stderr).not.toContain("secret-webhook-token");
});

test("runCli explains diagnostic codes", async () => {
  let stdout = "";
  const exitCode = await runCli(["explain", "CMS-ROUTE-404"], {
    stdout: (text) => {
      stdout += text;
    },
    stderr: () => {},
  });

  expect(exitCode).toBe(0);
  expect(stdout).toContain("CMS-ROUTE-404");
  expect(stdout).toContain("route mapping resolved to a URL");
});

test("runCli init writes a starter config and refuses to overwrite by default", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));

  const firstExitCode = await runCli(["init"], {
    cwd,
    stdout: () => {},
    stderr: () => {},
  });
  const secondExitCode = await runCli(["init"], {
    cwd,
    stdout: () => {},
    stderr: () => {},
  });

  expect(firstExitCode).toBe(0);
  expect(secondExitCode).toBe(2);
  expect(await readFile(join(cwd, "cms-lab.config.ts"), "utf8")).toContain(
    "defineConfig",
  );
});

test("runCli rejects check groups that are not implemented", async () => {
  let stderr = "";
  const exitCode = await runCli(["scan", "--only", "links"], {
    cwd: await mkdtemp(join(tmpdir(), "cms-lab-cli-")),
    stdout: () => {},
    stderr: (text) => {
      stderr += text;
    },
  });

  expect(exitCode).toBe(2);
  expect(stderr).toContain("Unknown check group");
  expect(stderr).toContain("routes, seo, a11y, images, fields");
});

test("runCli doctor validates config, project, site, and CMS connectivity", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stdout = "";
  const exitCode = await runCli(["doctor", "--config", configPath], {
    cwd,
    stdout: (text) => {
      stdout += text;
    },
    stderr: () => {},
    fetchPrismicDocuments: async () => [
      {
        id: "page-1",
        type: "page",
        uid: "about",
        status: "published",
        data: {},
      },
    ],
    fetch: async () => new Response("ok"),
  });

  expect(exitCode).toBe(0);
  expect(stdout).toContain("config ok");
  expect(stdout).toContain("next app ok");
  expect(stdout).toContain("site ok");
  expect(stdout).toContain("cms ok - 1 document");
});

test("runCli doctor accepts Next.js Pages Router projects", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "pages"), { recursive: true });
  await writeFile(join(cwd, "next.config.mjs"), "export default {}");
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'pages' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stdout = "";
  const exitCode = await runCli(["doctor", "--config", configPath], {
    cwd,
    stdout: (text) => {
      stdout += text;
    },
    stderr: () => {},
    fetchPrismicDocuments: async () => [
      {
        id: "page-1",
        type: "page",
        uid: "about",
        status: "published",
        data: {},
      },
    ],
    fetch: async () => new Response("ok"),
  });

  expect(exitCode).toBe(0);
  expect(stdout).toContain("next pages ok");
  expect(stdout).toContain("site ok");
  expect(stdout).toContain("cms ok - 1 document");
});

test("runCli doctor supports debug verbosity", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stderr = "";
  const exitCode = await runCli(
    ["doctor", "--config", configPath, "--debug", "--verbose", "3"],
    {
      cwd,
      stdout: () => {},
      stderr: (text) => {
        stderr += text;
      },
      fetchPrismicDocuments: async () => [
        {
          id: "page-1",
          type: "page",
          uid: "about",
          status: "published",
          data: {},
        },
      ],
      fetch: async () => new Response("ok"),
    },
  );

  expect(exitCode).toBe(0);
  expect(stderr).toContain("[cms-lab:debug] doctor config");
  expect(stderr).toContain("[cms-lab:debug] doctor timing site probe");
  expect(stderr).toContain("[cms-lab:debug] doctor documents 1");
  expect(stderr).toContain("[cms-lab:debug] doctor document types page=1");
});

test("runCli doctor maps a non-OK site response to exit code 4", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let stderr = "";
  const exitCode = await runCli(["doctor", "--config", configPath], {
    cwd,
    stdout: () => {},
    stderr: (text) => {
      stderr += text;
    },
    fetchPrismicDocuments: async () => [],
    fetch: async () => new Response("server error", { status: 500 }),
  });

  expect(exitCode).toBe(4);
  expect(stderr).toContain("Site error");
  expect(stderr).toContain("HTTP 500");
});

test("runCli doctor retries transient site connectivity failures", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: { provider: 'prismic', repositoryName: 'demo' },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let attempts = 0;
  const exitCode = await runCli(["doctor", "--config", configPath], {
    cwd,
    stdout: () => {},
    stderr: () => {},
    fetchPrismicDocuments: async () => [],
    fetch: async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("temporary network failure");
      }

      return new Response("ok");
    },
  });

  expect(exitCode).toBe(0);
  expect(attempts).toBe(2);
});

test("runCli scans non-Prismic CMS configs through the generic CMS loader", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "cms-lab-cli-"));
  await mkdir(join(cwd, "app"), { recursive: true });
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { next: "^15.0.0" } }),
  );
  const configPath = join(cwd, "cms-lab.config.ts");
  await writeFile(
    configPath,
    `
      import { defineConfig } from '@cms-lab/core'
      export default defineConfig({
        site: { url: 'http://localhost:3000' },
        framework: { type: 'next', router: 'app' },
        cms: {
          provider: 'strapi',
          url: 'http://localhost:1337',
          collections: [{ type: 'page', endpoint: 'pages' }],
        },
        routes: [{ type: 'page', pattern: '/:uid', getPath: (doc) => '/' + doc.uid }],
      })
    `,
  );

  let provider = "";
  let stdout = "";
  const exitCode = await runCli(["scan", "--config", configPath, "--json"], {
    cwd,
    stdout: (text) => {
      stdout += text;
    },
    stderr: () => {},
    fetchCmsDocuments: async (config) => {
      provider = config.provider;
      return [
        {
          id: "page-1",
          type: "page",
          uid: "about",
          status: "published",
          data: { meta_title: "About", meta_description: "About page" },
        },
      ];
    },
    fetch: async () => new Response("ok"),
  });

  const result = JSON.parse(stdout);

  expect(exitCode).toBe(0);
  expect(provider).toBe("strapi");
  expect(result.documents).toHaveLength(1);
  expect(result.summary).toEqual({ errors: 0, warnings: 0, info: 0 });
});
