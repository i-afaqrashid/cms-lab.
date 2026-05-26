import { Command, CommanderError } from "commander";
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { performance } from "node:perf_hooks";
import {
  type CheckGroup,
  CmsFetchError,
  ConfigLoadError,
  SiteUnreachableError,
  explainDiagnostic,
  loadCmsLabConfig,
  resolveSiteHealthUrl,
  scanDocuments,
  type CMSDocument,
  type CmsProviderConfig,
  type FetchLike,
  type ProjectInfo,
  type ScanResult,
} from "@cms-lab/core";
import { fetchContentfulDocuments as defaultFetchContentfulDocuments } from "@cms-lab/contentful";
import { fetchDirectusDocuments as defaultFetchDirectusDocuments } from "@cms-lab/directus";
import { detectNextProject } from "@cms-lab/next";
import { fetchPrismicDocuments as defaultFetchPrismicDocuments } from "@cms-lab/prismic";
import { renderHtmlReport } from "@cms-lab/reporter";
import { fetchSanityDocuments as defaultFetchSanityDocuments } from "@cms-lab/sanity";
import { fetchStrapiDocuments as defaultFetchStrapiDocuments } from "@cms-lab/strapi";
import { fetchWordPressDocuments as defaultFetchWordPressDocuments } from "@cms-lab/wordpress";
import {
  postSlackPayload,
  renderJUnitReport,
  renderMarkdownSummary,
  renderSlackPayload,
  type ScanStatus,
} from "./exporters.js";
import {
  type AgentContextPreset,
  renderAgentContextFiles,
} from "./agent-context.js";
import { formatPrettyResult } from "./output.js";

export type CliDependencies = {
  cwd?: string;
  stdout?: (text: string) => void;
  stderr?: (text: string) => void;
  env?: Record<string, string | undefined>;
  isStdoutTTY?: boolean;
  fetch?: FetchLike;
  fetchCmsDocuments?: (config: CmsProviderConfig) => Promise<CMSDocument[]>;
  fetchPrismicDocuments?: (config: CmsProviderConfig) => Promise<CMSDocument[]>;
};

type ScanCommandOptions = {
  url?: string;
  config?: string;
  json?: boolean;
  ci?: boolean;
  type?: string[];
  only?: string[];
  skip?: string[];
  timeout?: string;
  concurrency?: string;
  retries?: string;
  failOn?: string;
  maxWarnings?: string;
  maxInfo?: string;
  strict?: boolean;
  report?: boolean | string;
  markdown?: boolean | string;
  junit?: boolean | string;
  slackWebhook?: string;
  notifyOn?: string;
  includeSensitiveOutput?: boolean;
  shareReport?: boolean;
  debug?: boolean;
  verbose?: string;
  color?: boolean;
};

type DoctorCommandOptions = {
  url?: string;
  config?: string;
  timeout?: string;
  retries?: string;
  debug?: boolean;
  verbose?: string;
};

type InitCommandOptions = {
  config?: string;
  force?: boolean;
  cms?: string;
  router?: string;
  repository?: string;
  url?: string;
  strapiUrl?: string;
  strapiLocale?: string;
  directusUrl?: string;
};

type AgentContextCommandOptions = {
  config?: string;
  mode?: string;
  out?: string;
  preset?: string;
  force?: boolean;
  agentsMd?: boolean;
};

export async function runCli(
  argv: string[],
  dependencies: CliDependencies = {},
): Promise<number> {
  let exitCode = 0;
  const program = new Command()
    .name("cms-lab")
    .description("Catch CMS bugs before deploy.")
    .version("1.2.6")
    .exitOverride()
    .configureOutput({
      writeOut: (text) => writeStdout(dependencies, text),
      writeErr: (text) => writeStderr(dependencies, text),
    });

  program.addHelpText(
    "after",
    `
Examples:
  cms-lab init
  cms-lab doctor --config cms-lab.config.ts
  cms-lab scan --ci --report
  cms-lab agent-context
  cms-lab agent-context --preset all
  cms-lab explain CMS-ROUTE-404
`,
  );

  program
    .command("scan")
    .description("Scan CMS content against configured site routes.")
    .option("--url <url>", "Override config.site.url")
    .option("--config <path>", "Path to cms-lab config file")
    .option("--json", "Print ScanResult JSON")
    .option("--ci", "Use stable CI-friendly terminal output")
    .option(
      "--fail-on <level>",
      "Exit with code 1 on error, warning, or never",
      "error",
    )
    .option(
      "--max-warnings <count>",
      "Exit with code 1 when warnings exceed this count",
    )
    .option(
      "--max-info <count>",
      "Exit with code 1 when info diagnostics exceed this count",
    )
    .option(
      "--strict",
      "Fail on warnings and info diagnostics. Equivalent to --fail-on warning --max-info 0.",
    )
    .option(
      "--report [path]",
      "Write an HTML report. Defaults to .cms-lab/report.html",
    )
    .option(
      "--share-report",
      "Redact CMS source IDs and local project paths in the HTML report",
    )
    .option(
      "--markdown [path]",
      "Write a Markdown summary. Defaults to .cms-lab/summary.md",
    )
    .option(
      "--junit [path]",
      "Write a JUnit XML report. Defaults to .cms-lab/junit.xml",
    )
    .option(
      "--slack-webhook <url>",
      "Post a redacted scan summary to a Slack incoming webhook",
    )
    .option(
      "--notify-on <mode>",
      "When to notify Slack: always, failure, or diagnostics",
      "failure",
    )
    .option(
      "--include-sensitive-output",
      "Include raw CMS document data and local project paths in --json output",
    )
    .option(
      "--type <type>",
      "Limit scan to a CMS content type. Repeatable; comma-separated values are allowed.",
      collectOption,
      [],
    )
    .option(
      "--only <check>",
      "Run only a check group. Repeatable; comma-separated values are allowed.",
      collectOption,
      [],
    )
    .option(
      "--skip <check>",
      "Skip a check group. Repeatable; comma-separated values are allowed.",
      collectOption,
      [],
    )
    .option("--timeout <ms>", "Per-route HTTP timeout in milliseconds")
    .option("--concurrency <count>", "Maximum concurrent route probes")
    .option("--retries <count>", "Retry transient route probe failures", "1")
    .option("--debug", "Write debug logs to stderr")
    .option("--verbose <level>", "Debug verbosity level: 0, 1, 2, or 3")
    .option("--no-color", "Disable ANSI color in terminal output")
    .addHelpText(
      "after",
      `
Examples:
  cms-lab scan
  cms-lab scan --url https://staging.example.com
  cms-lab scan --ci --report
  cms-lab scan --json --include-sensitive-output
  cms-lab scan --only routes,fields --fail-on warning
`,
    )
    .action(async (options: ScanCommandOptions) => {
      exitCode = await runScan(options, dependencies);
    });

  program
    .command("doctor")
    .description(
      "Validate cms-lab config, project, site, and CMS connectivity.",
    )
    .option("--url <url>", "Override config.site.url")
    .option("--config <path>", "Path to cms-lab config file")
    .option("--timeout <ms>", "HTTP timeout in milliseconds")
    .option("--retries <count>", "Retry transient connectivity failures", "1")
    .option("--debug", "Write debug logs to stderr")
    .option("--verbose <level>", "Debug verbosity level: 0, 1, 2, or 3")
    .addHelpText(
      "after",
      `
Examples:
  cms-lab doctor
  cms-lab doctor --config cms-lab.config.ts
  cms-lab doctor --url https://staging.example.com --debug
`,
    )
    .action(async (options: DoctorCommandOptions) => {
      exitCode = await runDoctor(options, dependencies);
    });

  program
    .command("explain")
    .argument("<code>", "Diagnostic code to explain")
    .description("Explain a cms-lab diagnostic code.")
    .addHelpText(
      "after",
      `
Examples:
  cms-lab explain CMS-ROUTE-404
  cms-lab explain SEO-META-MISSING
`,
    )
    .action((code: string) => {
      exitCode = runExplain(code, dependencies);
    });

  program
    .command("init")
    .description("Create a starter cms-lab.config.ts file.")
    .option("--config <path>", "Config file path", "cms-lab.config.ts")
    .option("--force", "Overwrite an existing config file")
    .option(
      "--cms <provider>",
      "Starter CMS provider: prismic, strapi, or directus",
      "prismic",
    )
    .option("--router <router>", "Next.js router: app or pages", "app")
    .option("--repository <name>", "Prismic repository name", "my-repo")
    .option("--url <url>", "Site URL", "http://localhost:3000")
    .option(
      "--strapi-url <url>",
      "Strapi REST API URL",
      "http://localhost:1337",
    )
    .option("--strapi-locale <locale>", "Strapi locale query param")
    .option("--directus-url <url>", "Directus API URL", "http://localhost:8055")
    .addHelpText(
      "after",
      `
Examples:
  cms-lab init
  cms-lab init --repository my-prismic-repo --url http://localhost:3000
  cms-lab init --cms strapi --router pages --strapi-url http://localhost:1337
  cms-lab init --cms directus --router pages --directus-url http://localhost:8055
  cms-lab init --config cms-lab.config.ts --force
`,
    )
    .action(async (options: InitCommandOptions) => {
      exitCode = await runInit(options, dependencies);
    });

  program
    .command("agent-context")
    .description("Generate AI-agent handoff files for cms-lab projects.")
    .option("--config <path>", "Path to cms-lab config file")
    .option("--mode <mode>", "Project mode: auto, next, or cms-only", "auto")
    .option(
      "--out <dir>",
      "Directory for generated cms-lab agent files",
      ".cms-lab",
    )
    .option(
      "--preset <preset>",
      "Agent preset: generic, codex, claude, gemini, copilot, or all",
      "generic",
    )
    .option("--force", "Overwrite existing generated files")
    .option("--no-agents-md", "Do not create or update AGENTS.md")
    .addHelpText(
      "after",
      `
Examples:
  cms-lab agent-context
  cms-lab agent-context --config cms-lab.config.ts
  cms-lab agent-context --mode cms-only
  cms-lab agent-context --preset all
  cms-lab agent-context --preset claude
  cms-lab agent-context --preset copilot
  cms-lab agent-context --out .cms-lab --force
`,
    )
    .action(async (options: AgentContextCommandOptions) => {
      exitCode = await runAgentContext(options, dependencies);
    });

  try {
    await program.parseAsync(argv, { from: "user" });
    return exitCode;
  } catch (error) {
    if (error instanceof CommanderError) {
      return error.exitCode ?? 2;
    }

    writeStderr(dependencies, `Unexpected error: ${messageFrom(error)}\n`);
    return 2;
  }
}

async function runScan(
  options: ScanCommandOptions,
  dependencies: CliDependencies,
): Promise<number> {
  const cwd = dependencies.cwd ?? process.cwd();
  let debug = createNoopDebugLogger();
  let endTotal = () => {};

  try {
    debug = createDebugLogger(
      "scan",
      options.debug,
      options.verbose,
      dependencies,
    );
    endTotal = debug.time("total", 2);
    const timeoutMs = parseTimeout(options.timeout);
    const concurrency = parseConcurrency(options.concurrency);
    const retries = parseRetries(options.retries);
    const strict = Boolean(options.strict);
    const failOn = strict ? "warning" : parseFailOn(options.failOn);
    const maxWarnings = parseOptionalThreshold(
      options.maxWarnings,
      "--max-warnings",
    );
    const maxInfo = parseOptionalThreshold(
      options.maxInfo ?? (strict ? "0" : undefined),
      "--max-info",
    );
    const notifyOn = parseNotifyOn(options.notifyOn);
    const filters = {
      types: splitList(options.type),
      only: parseCheckGroups(options.only),
      skip: parseCheckGroups(options.skip),
    };
    debug.log(1, `cwd ${cwd}`);
    debug.log(
      2,
      `options ${describeScanOptions(
        { ...options, failOn, maxWarnings, maxInfo },
        filters,
      )}`,
    );

    const endConfig = debug.time("config", 2);
    const loaded = await loadCmsLabConfig({ cwd, configPath: options.config });
    endConfig();
    const config = {
      ...loaded.config,
      site: {
        ...loaded.config.site,
        url: options.url ?? loaded.config.site.url,
      },
    };
    debug.log(1, `config ${loaded.configFile ?? "inline"}`);
    debug.log(1, `site ${config.site.url}`);
    debug.log(1, `cms ${describeCms(config.cms)}`);

    const endProject = debug.time("project detection", 2);
    const project = await detectNextProject(cwd);
    endProject();
    assertConfiguredRouterMatchesProject(config.framework.router, project);
    debug.log(
      1,
      `project next ${project.router} dir=${projectDirectory(project)}`,
    );

    const endCms = debug.time("cms fetch", 2);
    const documents = await fetchCmsDocuments(config.cms, dependencies);
    endCms();
    debug.log(1, `documents ${documents.length}`);
    debug.log(3, `document types ${describeDocumentTypes(documents)}`);
    assertTypeFilterMatched(documents, filters.types);

    const endScan = debug.time("scan", 2);
    const result = await scanDocuments({
      config,
      project,
      documents,
      fetch: dependencies.fetch,
      timeoutMs,
      concurrency,
      retries,
      filters,
    });
    endScan();
    debug.log(
      1,
      `summary errors=${result.summary.errors} warnings=${result.summary.warnings} info=${result.summary.info}`,
    );

    const exitCode = exitCodeForResult(result, {
      failOn,
      maxWarnings,
      maxInfo,
    });
    const status = exitCode === 0 ? "passed" : "failed";

    const endReport = debug.time("exports", 2);
    await maybeWriteReport(options.report, result, cwd, {
      share: Boolean(options.shareReport),
    });
    await maybeWriteMarkdown(options.markdown, result, status, cwd);
    await maybeWriteJUnit(options.junit, result, cwd);
    const slackSent = await maybePostSlack({
      webhookUrl: options.slackWebhook,
      notifyOn,
      result,
      status,
      fetchImpl: dependencies.fetch,
    });
    endReport();
    if (options.report) {
      debug.log(1, `report ${reportPathFromOption(options.report, cwd)}`);
    }
    if (options.markdown) {
      debug.log(1, `markdown ${markdownPathFromOption(options.markdown, cwd)}`);
    }
    if (options.junit) {
      debug.log(1, `junit ${junitPathFromOption(options.junit, cwd)}`);
    }
    if (slackSent) {
      debug.log(1, "slack webhook sent");
    } else if (options.slackWebhook) {
      debug.log(1, "slack webhook skipped");
    }

    if (options.json) {
      writeStdout(
        dependencies,
        `${JSON.stringify(jsonOutputResult(result, options), null, 2)}\n`,
      );
    } else {
      writeStdout(
        dependencies,
        formatPrettyResult(result, {
          color: shouldUseColor(options, dependencies),
          failOn,
          maxWarnings,
          maxInfo,
          hints: !options.ci,
        }),
      );
      if (options.report) {
        writeStdout(
          dependencies,
          `report ${reportPathFromOption(options.report, cwd)}\n`,
        );
      }
      if (options.markdown) {
        writeStdout(
          dependencies,
          `markdown ${markdownPathFromOption(options.markdown, cwd)}\n`,
        );
      }
      if (options.junit) {
        writeStdout(
          dependencies,
          `junit ${junitPathFromOption(options.junit, cwd)}\n`,
        );
      }
    }

    endTotal();
    return exitCode;
  } catch (error) {
    endTotal();
    debug.log(1, `error ${safeMessageFrom(error)}`);
    if (error instanceof ConfigLoadError) {
      writeStderr(
        dependencies,
        `Config error: ${redactSensitive(error.message)}\n`,
      );
      return 2;
    }

    if (error instanceof CmsFetchError) {
      writeStderr(
        dependencies,
        `CMS error: ${redactSensitive(error.message)}\n`,
      );
      return 3;
    }

    if (error instanceof SiteUnreachableError) {
      writeStderr(
        dependencies,
        `Site error: ${redactSensitive(error.message)}\n`,
      );
      return 4;
    }

    writeStderr(dependencies, `Unexpected error: ${safeMessageFrom(error)}\n`);
    return 2;
  }
}

async function runDoctor(
  options: DoctorCommandOptions,
  dependencies: CliDependencies,
): Promise<number> {
  const cwd = dependencies.cwd ?? process.cwd();
  let debug = createNoopDebugLogger();
  let endTotal = () => {};

  try {
    debug = createDebugLogger(
      "doctor",
      options.debug,
      options.verbose,
      dependencies,
    );
    endTotal = debug.time("total", 2);
    const timeoutMs = parseTimeout(options.timeout) ?? 5000;
    const retries = parseRetries(options.retries) ?? 1;
    debug.log(1, `cwd ${cwd}`);
    debug.log(
      2,
      `options timeout=${timeoutMs} retries=${retries} url=${options.url ?? "config"}`,
    );

    const endConfig = debug.time("config", 2);
    const loaded = await loadCmsLabConfig({ cwd, configPath: options.config });
    endConfig();
    const config = {
      ...loaded.config,
      site: {
        ...loaded.config.site,
        url: options.url ?? loaded.config.site.url,
      },
    };
    debug.log(1, `config ${loaded.configFile ?? "inline"}`);
    debug.log(1, `site ${config.site.url}`);
    debug.log(1, `cms ${describeCms(config.cms)}`);
    writeStdout(
      dependencies,
      `config ok${loaded.configFile ? ` - ${loaded.configFile}` : ""}\n`,
    );

    const endProject = debug.time("project detection", 2);
    const project = await detectNextProject(cwd);
    endProject();
    assertConfiguredRouterMatchesProject(config.framework.router, project);
    debug.log(
      1,
      `project next ${project.router} dir=${projectDirectory(project)}`,
    );
    writeStdout(
      dependencies,
      `next ${project.router} ok - ${projectDirectory(project)}\n`,
    );

    const endSite = debug.time("site probe", 2);
    const healthUrl = resolveSiteHealthUrl(config.site).toString();
    await fetchSite(healthUrl, dependencies.fetch, timeoutMs, retries);
    endSite();
    writeStdout(dependencies, `site ok - ${siteUrlForOutput(healthUrl)}\n`);

    const endCms = debug.time("cms fetch", 2);
    const documents = await fetchCmsDocuments(config.cms, dependencies);
    endCms();
    debug.log(1, `documents ${documents.length}`);
    debug.log(3, `document types ${describeDocumentTypes(documents)}`);
    writeStdout(
      dependencies,
      `cms ok - ${documents.length} ${plural(documents.length, "document")}\n`,
    );

    endTotal();
    return 0;
  } catch (error) {
    endTotal();
    debug.log(1, `error ${safeMessageFrom(error)}`);
    if (error instanceof ConfigLoadError) {
      writeStderr(
        dependencies,
        `Config error: ${redactSensitive(error.message)}\n`,
      );
      return 2;
    }

    if (error instanceof CmsFetchError) {
      writeStderr(
        dependencies,
        `CMS error: ${redactSensitive(error.message)}\n`,
      );
      return 3;
    }

    if (error instanceof SiteUnreachableError) {
      writeStderr(
        dependencies,
        `Site error: ${redactSensitive(error.message)}\n`,
      );
      return 4;
    }

    writeStderr(dependencies, `Unexpected error: ${safeMessageFrom(error)}\n`);
    return 2;
  }
}

function runExplain(code: string, dependencies: CliDependencies): number {
  const explanation = explainDiagnostic(code);

  if (!explanation) {
    writeStderr(dependencies, `Unknown diagnostic code: ${code}\n`);
    return 2;
  }

  writeStdout(
    dependencies,
    [
      `${explanation.code} (${explanation.severity})`,
      explanation.title,
      "",
      `Meaning: ${explanation.meaning}`,
      `Fix: ${explanation.fix}`,
      "",
    ].join("\n"),
  );
  return 0;
}

async function runInit(
  options: InitCommandOptions,
  dependencies: CliDependencies,
): Promise<number> {
  const cwd = dependencies.cwd ?? process.cwd();
  const target = resolve(cwd, options.config ?? "cms-lab.config.ts");

  try {
    if (!options.force && (await fileExists(target))) {
      writeStderr(
        dependencies,
        `Config error: ${target} already exists. Use --force to overwrite it.\n`,
      );
      return 2;
    }

    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, starterConfig(parseInitOptions(options)));
    writeStdout(dependencies, `created ${target}\n`);
    return 0;
  } catch (error) {
    writeStderr(dependencies, `Config error: ${messageFrom(error)}\n`);
    return 2;
  }
}

async function runAgentContext(
  options: AgentContextCommandOptions,
  dependencies: CliDependencies,
): Promise<number> {
  const cwd = dependencies.cwd ?? process.cwd();

  try {
    const mode = parseAgentContextMode(options.mode);
    const loaded = await loadCmsLabConfig({ cwd, configPath: options.config });
    const project =
      mode === "cms-only"
        ? undefined
        : await detectOptionalNextProject(cwd, mode);

    if (project) {
      assertConfiguredRouterMatchesProject(
        loaded.config.framework.router,
        project,
      );
    } else {
      writeStdout(
        dependencies,
        "No Next.js project detected; generating CMS-only agent context.\n",
      );
    }

    const files = renderAgentContextFiles({
      config: loaded.config,
      project,
      configFile: safeRelativePath(cwd, loaded.configFile),
      outputDir: options.out ?? ".cms-lab",
      includeAgentsMd: options.agentsMd !== false,
      preset: parseAgentContextPreset(options.preset),
    });
    const existingFiles: string[] = [];

    for (const file of files) {
      const target = resolve(cwd, file.path);
      if (!isInsideDirectory(cwd, target)) {
        throw new ConfigLoadError(
          `Refusing to write outside the project: ${file.path}`,
        );
      }

      if (!options.force && (await fileExists(target))) {
        existingFiles.push(file.path);
      }
    }

    if (existingFiles.length > 0) {
      writeStderr(
        dependencies,
        `Config error: ${existingFiles.join(", ")} already exists. Use --force to overwrite it.\n`,
      );
      return 2;
    }

    for (const file of files) {
      const target = resolve(cwd, file.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content, "utf8");
      writeStdout(dependencies, `created ${file.path}\n`);
    }

    return 0;
  } catch (error) {
    if (error instanceof ConfigLoadError) {
      writeStderr(
        dependencies,
        `Config error: ${redactSensitive(error.message)}\n`,
      );
      return 2;
    }

    writeStderr(dependencies, `Config error: ${safeMessageFrom(error)}\n`);
    return 2;
  }
}

type AgentContextMode = "auto" | "next" | "cms-only";

function parseAgentContextMode(value: string | undefined): AgentContextMode {
  const mode = value ?? "auto";
  if (mode === "auto" || mode === "next" || mode === "cms-only") {
    return mode;
  }

  throw new ConfigLoadError("--mode must be one of: auto, next, cms-only");
}

async function detectOptionalNextProject(
  cwd: string,
  mode: AgentContextMode,
): Promise<ProjectInfo | undefined> {
  try {
    return await detectNextProject(cwd);
  } catch (error) {
    if (mode === "next" || !(error instanceof ConfigLoadError)) {
      throw error;
    }

    return undefined;
  }
}

function writeStdout(dependencies: CliDependencies, text: string): void {
  if (dependencies.stdout) {
    dependencies.stdout(text);
    return;
  }

  process.stdout.write(text);
}

function writeStderr(dependencies: CliDependencies, text: string): void {
  if (dependencies.stderr) {
    dependencies.stderr(text);
    return;
  }

  process.stderr.write(text);
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function safeMessageFrom(error: unknown): string {
  return redactSensitive(messageFrom(error));
}

function redactSensitive(value: string): string {
  return value
    .replaceAll(/(access_token=)[^&\s]+/gi, "$1[redacted]")
    .replaceAll(/([?&](?:token|password|secret)=)[^&\s]+/gi, "$1[redacted]")
    .replaceAll(/\bBearer\s+[-._~+/=a-z0-9]+/gi, "Bearer [redacted]")
    .replaceAll(/(https?:\/\/)([^:\s/@]+):([^@\s/]+)@/gi, "$1[redacted]@");
}

function jsonOutputResult(
  result: ScanResult,
  options: Pick<ScanCommandOptions, "includeSensitiveOutput">,
): ScanResult {
  if (options.includeSensitiveOutput) {
    return result;
  }

  return {
    ...result,
    project: {
      framework: result.project.framework,
      router: result.project.router,
      rootDir:
        "[redacted: pass --include-sensitive-output to emit raw project paths]",
      ...(result.project.appDir
        ? {
            appDir:
              "[redacted: pass --include-sensitive-output to emit raw project paths]",
          }
        : {}),
      ...(result.project.pagesDir
        ? {
            pagesDir:
              "[redacted: pass --include-sensitive-output to emit raw project paths]",
          }
        : {}),
    },
    documents: result.documents.map((document) => ({
      id: document.id,
      type: document.type,
      status: document.status,
      data: "[redacted: pass --include-sensitive-output to emit raw CMS data]",
    })),
  };
}

function collectOption(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function splitList(values: string[] | undefined): string[] {
  return [
    ...new Set(
      (values ?? [])
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

type VerbosityLevel = 0 | 1 | 2 | 3;

type DebugLogger = {
  log: (level: Exclude<VerbosityLevel, 0>, message: string) => void;
  time: (label: string, level?: Exclude<VerbosityLevel, 0>) => () => void;
};

function createNoopDebugLogger(): DebugLogger {
  return {
    log: () => {},
    time: () => () => {},
  };
}

function createDebugLogger(
  command: "scan" | "doctor",
  debug: boolean | undefined,
  verbose: string | undefined,
  dependencies: CliDependencies,
): DebugLogger {
  const level = parseVerbosity(debug, verbose);

  return {
    log: (messageLevel, message) => {
      if (level < messageLevel) {
        return;
      }

      writeStderr(dependencies, `[cms-lab:debug] ${command} ${message}\n`);
    },
    time: (label, messageLevel = 2) => {
      if (level < messageLevel) {
        return () => {};
      }

      const startedAt = performance.now();
      let ended = false;
      return () => {
        if (ended) {
          return;
        }

        ended = true;
        writeStderr(
          dependencies,
          `[cms-lab:debug] ${command} timing ${label} ${formatDuration(
            performance.now() - startedAt,
          )}\n`,
        );
      };
    },
  };
}

function parseVerbosity(
  debug: boolean | undefined,
  verbose: string | undefined,
): VerbosityLevel {
  if (verbose === undefined) {
    return debug ? 1 : 0;
  }

  if (
    verbose === "0" ||
    verbose === "1" ||
    verbose === "2" ||
    verbose === "3"
  ) {
    return Number(verbose) as VerbosityLevel;
  }

  throw new ConfigLoadError("--verbose must be one of: 0, 1, 2, 3");
}

function parseAgentContextPreset(
  value: string | undefined,
): AgentContextPreset {
  const preset = value ?? "generic";

  if (
    preset === "generic" ||
    preset === "codex" ||
    preset === "claude" ||
    preset === "gemini" ||
    preset === "copilot" ||
    preset === "all"
  ) {
    return preset;
  }

  throw new ConfigLoadError(
    "--preset must be one of: generic, codex, claude, gemini, copilot, all",
  );
}

function shouldUseColor(
  options: Pick<ScanCommandOptions, "ci" | "color">,
  dependencies: CliDependencies,
): boolean {
  if (options.ci || options.color === false) {
    return false;
  }

  const env = dependencies.env ?? process.env;
  if (env.NO_COLOR || env.TERM === "dumb") {
    return false;
  }

  return dependencies.isStdoutTTY ?? Boolean(process.stdout.isTTY);
}

function describeScanOptions(
  options: Omit<ScanCommandOptions, "failOn" | "maxWarnings" | "maxInfo"> & {
    failOn: FailOnLevel;
    maxWarnings?: number;
    maxInfo?: number;
  },
  filters: { types: string[]; only: CheckGroup[]; skip: CheckGroup[] },
): string {
  return [
    `json=${Boolean(options.json)}`,
    `ci=${Boolean(options.ci)}`,
    `report=${Boolean(options.report)}`,
    `markdown=${Boolean(options.markdown)}`,
    `junit=${Boolean(options.junit)}`,
    `slackWebhook=${Boolean(options.slackWebhook)}`,
    `notifyOn=${options.notifyOn ?? "failure"}`,
    `failOn=${options.failOn}`,
    `maxWarnings=${options.maxWarnings ?? "none"}`,
    `maxInfo=${options.maxInfo ?? "none"}`,
    `timeout=${options.timeout ?? "default"}`,
    `concurrency=${options.concurrency ?? "default"}`,
    `retries=${options.retries ?? "1"}`,
    `types=${formatList(filters.types)}`,
    `only=${formatList(filters.only)}`,
    `skip=${formatList(filters.skip)}`,
  ].join(" ");
}

function describeCms(config: CmsProviderConfig): string {
  if (config.provider === "prismic") {
    return `prismic repository=${config.repositoryName}`;
  }

  if (config.provider === "strapi") {
    return `strapi url=${safeUrl(config.url)} collections=${formatList(
      (config.collections ?? []).map((collection) => collection.endpoint),
    )} singleTypes=${formatList(
      (config.singleTypes ?? []).map((singleType) => singleType.endpoint),
    )}`;
  }

  if (config.provider === "directus") {
    return `directus url=${safeUrl(config.url)} collections=${formatList(
      config.collections.map((collection) => collection.collection),
    )}`;
  }

  if (config.provider === "contentful") {
    return `contentful space=${config.spaceId} environment=${config.environment ?? "master"} contentTypes=${formatList(
      config.contentTypes.map((contentType) => contentType.contentType),
    )}`;
  }

  if (config.provider === "sanity") {
    return `sanity project=${config.projectId} dataset=${config.dataset} documentTypes=${formatList(
      config.contentTypes.map((contentType) => contentType.documentType),
    )}`;
  }

  return `wordpress url=${safeUrl(config.url)} contentTypes=${formatList(
    config.contentTypes?.map((contentType) => contentType.endpoint) ?? [
      "pages",
      "posts",
    ],
  )}`;
}

function describeDocumentTypes(documents: CMSDocument[]): string {
  const counts = new Map<string, number>();
  for (const document of documents) {
    counts.set(document.type, (counts.get(document.type) ?? 0) + 1);
  }

  return (
    [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([type, count]) => `${type}=${count}`)
      .join(", ") || "none"
  );
}

function safeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "<invalid-url>";
  }
}

function siteUrlForOutput(value: string): string {
  try {
    const url = new URL(value);
    const auth = url.username || url.password ? "[redacted]@" : "";
    const hash = url.hash ? "#[redacted]" : "";
    return `${url.protocol}//${auth}${url.host}${url.pathname}${url.search ? "?[redacted]" : ""}${hash}`;
  } catch {
    return redactSensitive(value);
  }
}

function formatList(values: readonly string[]): string {
  return values.length > 0 ? values.join(",") : "none";
}

function formatDuration(ms: number): string {
  return `${ms.toFixed(1)}ms`;
}

async function fetchCmsDocuments(
  config: CmsProviderConfig,
  dependencies: CliDependencies,
): Promise<CMSDocument[]> {
  if (dependencies.fetchCmsDocuments) {
    return dependencies.fetchCmsDocuments(config);
  }

  if (config.provider === "prismic") {
    const loadDocuments =
      dependencies.fetchPrismicDocuments ??
      ((cmsConfig: CmsProviderConfig) => {
        if (cmsConfig.provider !== "prismic") {
          throw new ConfigLoadError(
            `fetchPrismicDocuments cannot load ${cmsConfig.provider}`,
          );
        }

        return defaultFetchPrismicDocuments(cmsConfig, {
          fetch: dependencies.fetch,
        });
      });

    return loadDocuments(config);
  }

  if (config.provider === "strapi") {
    return defaultFetchStrapiDocuments(config, { fetch: dependencies.fetch });
  }

  if (config.provider === "directus") {
    return defaultFetchDirectusDocuments(config, { fetch: dependencies.fetch });
  }

  if (config.provider === "contentful") {
    return defaultFetchContentfulDocuments(config, {
      fetch: dependencies.fetch,
    });
  }

  if (config.provider === "sanity") {
    return defaultFetchSanityDocuments(config, { fetch: dependencies.fetch });
  }

  return defaultFetchWordPressDocuments(config, { fetch: dependencies.fetch });
}

function assertTypeFilterMatched(
  documents: CMSDocument[],
  types: string[],
): void {
  if (types.length === 0) {
    return;
  }

  if (documents.some((document) => types.includes(document.type))) {
    return;
  }

  const availableTypes = [
    ...new Set(documents.map((document) => document.type)),
  ]
    .sort()
    .join(", ");
  throw new ConfigLoadError(
    `No CMS documents matched --type ${types.join(", ")}. Available types: ${
      availableTypes || "none"
    }`,
  );
}

function parseCheckGroups(values: string[] | undefined): CheckGroup[] {
  const allowed = new Set([
    "routes",
    "seo",
    "a11y",
    "images",
    "fields",
    "relationships",
  ]);
  const groups = splitList(values);

  for (const group of groups) {
    if (!allowed.has(group)) {
      throw new ConfigLoadError(
        `Unknown check group "${group}". Expected one of: ${[...allowed].join(", ")}`,
      );
    }
  }

  return groups as CheckGroup[];
}

function parseTimeout(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const timeout = Number(value);
  if (!Number.isInteger(timeout) || timeout <= 0) {
    throw new ConfigLoadError("--timeout must be a positive integer");
  }

  return timeout;
}

function parseConcurrency(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const concurrency = Number(value);
  if (!Number.isInteger(concurrency) || concurrency <= 0) {
    throw new ConfigLoadError("--concurrency must be a positive integer");
  }

  return concurrency;
}

function parseRetries(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const retries = Number(value);
  if (!Number.isInteger(retries) || retries < 0) {
    throw new ConfigLoadError("--retries must be a non-negative integer");
  }

  return retries;
}

function parseOptionalThreshold(
  value: string | undefined,
  flag: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const threshold = Number(value);
  if (!Number.isInteger(threshold) || threshold < 0) {
    throw new ConfigLoadError(`${flag} must be a non-negative integer`);
  }

  return threshold;
}

async function fetchSite(
  url: string,
  fetchImpl: FetchLike | undefined,
  timeoutMs: number,
  retries: number,
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await (fetchImpl ?? fetch)(url, {
        method: "GET",
        signal: controller.signal,
      });
      if (!response.ok) {
        lastError = new Error(`Site ${url} returned HTTP ${response.status}`);
        if (attempt >= retries) {
          break;
        }
        continue;
      }
      return;
    } catch (error) {
      lastError = error;
      if (attempt >= retries) {
        break;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new SiteUnreachableError(messageFrom(lastError));
}

type FailOnLevel = "error" | "warning" | "never";

function parseFailOn(value: string | undefined): FailOnLevel {
  const level = value ?? "error";
  if (level === "error" || level === "warning" || level === "never") {
    return level;
  }

  throw new ConfigLoadError("--fail-on must be one of: error, warning, never");
}

function exitCodeForResult(
  result: ScanResult,
  options: {
    failOn: FailOnLevel;
    maxWarnings?: number;
    maxInfo?: number;
  },
): number {
  const { failOn, maxWarnings, maxInfo } = options;

  if (failOn === "never") {
    return thresholdExceeded(result, maxWarnings, maxInfo) ? 1 : 0;
  }

  if (result.summary.errors > 0) {
    return 1;
  }

  if (failOn === "warning" && result.summary.warnings > 0) {
    return 1;
  }

  if (thresholdExceeded(result, maxWarnings, maxInfo)) {
    return 1;
  }

  return 0;
}

function thresholdExceeded(
  result: ScanResult,
  maxWarnings: number | undefined,
  maxInfo: number | undefined,
): boolean {
  return (
    (maxWarnings !== undefined && result.summary.warnings > maxWarnings) ||
    (maxInfo !== undefined && result.summary.info > maxInfo)
  );
}

async function maybeWriteReport(
  report: boolean | string | undefined,
  result: ScanResult,
  cwd: string,
  options: { share?: boolean } = {},
): Promise<void> {
  if (!report) {
    return;
  }

  const path = reportPathFromOption(report, cwd);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    renderHtmlReport(result, { privacy: options.share ? "share" : "full" }),
    "utf8",
  );
}

function reportPathFromOption(report: boolean | string, cwd: string): string {
  return resolve(
    cwd,
    typeof report === "string" ? report : ".cms-lab/report.html",
  );
}

async function maybeWriteMarkdown(
  markdown: boolean | string | undefined,
  result: ScanResult,
  status: ScanStatus,
  cwd: string,
): Promise<void> {
  if (!markdown) {
    return;
  }

  const path = markdownPathFromOption(markdown, cwd);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, renderMarkdownSummary(result, status), "utf8");
}

function markdownPathFromOption(
  markdown: boolean | string,
  cwd: string,
): string {
  return resolve(
    cwd,
    typeof markdown === "string" ? markdown : ".cms-lab/summary.md",
  );
}

async function maybeWriteJUnit(
  junit: boolean | string | undefined,
  result: ScanResult,
  cwd: string,
): Promise<void> {
  if (!junit) {
    return;
  }

  const path = junitPathFromOption(junit, cwd);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, renderJUnitReport(result), "utf8");
}

function junitPathFromOption(junit: boolean | string, cwd: string): string {
  return resolve(cwd, typeof junit === "string" ? junit : ".cms-lab/junit.xml");
}

type NotifyOn = "always" | "failure" | "diagnostics";

async function maybePostSlack(options: {
  webhookUrl?: string;
  notifyOn: NotifyOn;
  result: ScanResult;
  status: ScanStatus;
  fetchImpl?: FetchLike;
}): Promise<boolean> {
  if (!options.webhookUrl) {
    return false;
  }

  if (!shouldNotify(options.notifyOn, options.result, options.status)) {
    return false;
  }

  await postSlackPayload({
    webhookUrl: options.webhookUrl,
    fetchImpl: options.fetchImpl,
    payload: renderSlackPayload(options.result, options.status),
  });
  return true;
}

function shouldNotify(
  notifyOn: NotifyOn,
  result: ScanResult,
  status: ScanStatus,
): boolean {
  if (notifyOn === "always") {
    return true;
  }

  if (notifyOn === "failure") {
    return status === "failed";
  }

  return result.diagnostics.length > 0;
}

function parseNotifyOn(value: string | undefined): NotifyOn {
  const notifyOn = value ?? "failure";
  if (
    notifyOn === "always" ||
    notifyOn === "failure" ||
    notifyOn === "diagnostics"
  ) {
    return notifyOn;
  }

  throw new ConfigLoadError(
    "--notify-on must be one of: always, failure, diagnostics",
  );
}

function assertConfiguredRouterMatchesProject(
  configuredRouter: ProjectInfo["router"],
  project: ProjectInfo,
): void {
  if (configuredRouter !== project.router) {
    throw new ConfigLoadError(
      `cms-lab config declares Next.js ${configuredRouter} router but detected ${project.router} router`,
    );
  }
}

function projectDirectory(project: ProjectInfo): string {
  return project.appDir ?? project.pagesDir ?? project.rootDir;
}

function safeRelativePath(cwd: string, path: string | undefined): string {
  if (!path) {
    return "cms-lab config";
  }

  const relativePath = relative(cwd, path);
  if (
    relativePath &&
    !relativePath.startsWith("..") &&
    !isAbsolute(relativePath) &&
    !relativePath.includes(`..${sep}`)
  ) {
    return relativePath.split(sep).join("/");
  }

  return "custom cms-lab config";
}

function isInsideDirectory(cwd: string, target: string): boolean {
  const relativePath = relative(cwd, target);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") &&
      !isAbsolute(relativePath) &&
      !relativePath.includes(`..${sep}`))
  );
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function plural(value: number, singular: string): string {
  return value === 1 ? singular : `${singular}s`;
}

type ParsedInitOptions = {
  cms: "prismic" | "strapi" | "directus";
  router: ProjectInfo["router"];
  repository: string;
  url: string;
  strapiUrl: string;
  strapiLocale?: string;
  directusUrl: string;
};

function parseInitOptions(options: InitCommandOptions): ParsedInitOptions {
  const cms = options.cms ?? "prismic";
  if (cms !== "prismic" && cms !== "strapi" && cms !== "directus") {
    throw new ConfigLoadError(
      "--cms must be one of: prismic, strapi, directus",
    );
  }

  const router = options.router ?? "app";
  if (router !== "app" && router !== "pages") {
    throw new ConfigLoadError("--router must be one of: app, pages");
  }

  return {
    cms,
    router,
    repository: options.repository ?? "my-repo",
    url: options.url ?? "http://localhost:3000",
    strapiUrl: options.strapiUrl ?? "http://localhost:1337",
    strapiLocale: options.strapiLocale,
    directusUrl: options.directusUrl ?? "http://localhost:8055",
  };
}

function starterConfig(options: ParsedInitOptions): string {
  if (options.cms === "strapi") {
    return strapiStarterConfig(options);
  }

  if (options.cms === "directus") {
    return directusStarterConfig(options);
  }

  return `import { defineConfig } from "@cms-lab/core";

export default defineConfig({
  site: { url: ${JSON.stringify(options.url)} },
  framework: { type: "next", router: ${JSON.stringify(options.router)} },
  cms: {
    provider: "prismic",
    repositoryName: ${JSON.stringify(options.repository)},
    accessToken: process.env.PRISMIC_ACCESS_TOKEN,
  },
  routes: [
    { type: "page", pattern: "/:uid", getPath: (doc) => \`/\${doc.uid}\` },
    {
      type: "blog_post",
      pattern: "/blog/:uid",
      getPath: (doc) => \`/blog/\${doc.uid}\`,
    },
  ],
});
`;
}

function directusStarterConfig(options: ParsedInitOptions): string {
  return `import { defineConfig, readCmsDataPath } from "@cms-lab/core";

export default defineConfig({
  site: {
    url: ${JSON.stringify(options.url)},
    // Use healthPath when your app's root redirects or errors but a locale route is healthy.
    // healthPath: "/en",
  },
  framework: { type: "next", router: ${JSON.stringify(options.router)} },
  cms: {
    provider: "directus",
    url: ${JSON.stringify(options.directusUrl)},
    token: process.env.DIRECTUS_TOKEN,
    collections: [
      { type: "branch", collection: "branches", uidField: "slug" },
      { type: "menu_item", collection: "menu_items", uidField: "slug" },
      { type: "category", collection: "menu_categories", uidField: "slug" },
      {
        type: "pricing",
        collection: "item_branch_pricing",
        uidField: "id",
        routable: false,
      },
    ],
  },
  routes: [
    {
      type: "branch",
      pattern: "/branches/:slug",
      getPath: (doc) => \`/branches/\${doc.uid}\`,
    },
    {
      type: "category",
      pattern: "/categories/:slug",
      getPath: (doc) => \`/categories/\${doc.uid}\`,
    },
    {
      type: "menu_item",
      pattern: "/menu/:branch/:slug",
      getPath: (doc) => {
        const branch =
          readCmsDataPath(doc.data, "branch.slug") ??
          readCmsDataPath(doc.data, "branch_id.slug") ??
          "branch";

        return \`/menu/\${branch}/\${doc.uid}\`;
      },
    },
  ],
  checks: {
    fields: {
      required: [
        { type: "branch", path: "name" },
        { type: "branch", path: "city" },
        { type: "menu_item", path: "name" },
        { type: "menu_item", path: "base_price", severity: "warning" },
        { type: "pricing", path: "price", severity: "warning" },
        { type: "pricing", path: "is_available", severity: "warning" },
      ],
    },
    relationships: [
      {
        from: "menu_item",
        to: "pricing",
        where: { fromField: "id", toField: "menu_item_id" },
        min: 1,
        severity: "warning",
      },
    ],
  },
});
`;
}

function strapiStarterConfig(options: ParsedInitOptions): string {
  const localeLine = options.strapiLocale
    ? `\n    locale: ${JSON.stringify(options.strapiLocale)},`
    : "";

  return `import { defineConfig, strapiRelationSlug } from "@cms-lab/core";

export default defineConfig({
  site: {
    url: ${JSON.stringify(options.url)},
    // Use healthPath when your app's root redirects or errors but a locale route is healthy.
    // healthPath: "/en",
  },
  framework: { type: "next", router: ${JSON.stringify(options.router)} },
  cms: {
    provider: "strapi",
    url: ${JSON.stringify(options.strapiUrl)},
    token: process.env.STRAPI_TOKEN,${localeLine}
    collections: [
      { type: "page", endpoint: "pages", uidField: "slug" },
      { type: "article", endpoint: "articles", uidField: "slug" },
    ],
    singleTypes: [
      { type: "navbar", endpoint: "navbar" },
      { type: "footer", endpoint: "footer" },
    ],
  },
  routes: [
    { type: "page", pattern: "/:slug", getPath: (doc) => \`/\${doc.uid}\` },
    {
      type: "article",
      pattern: "/blog/:topic/:slug",
      getPath: (doc) => {
        const topic = strapiRelationSlug(doc.data, "topic") ?? "uncategorized";
        return \`/blog/\${topic}/\${doc.uid}\`;
      },
    },
  ],
});
`;
}
