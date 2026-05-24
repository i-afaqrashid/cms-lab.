import type {
  CmsLabConfig,
  CmsProviderConfig,
  ProjectInfo,
} from "@cms-lab/core";

export type AgentContextFile = {
  path: string;
  content: string;
};

export type AgentContextOptions = {
  config: CmsLabConfig;
  project: ProjectInfo;
  configFile: string;
  outputDir: string;
  includeAgentsMd: boolean;
};

const GITHUB_URL = "https://github.com/i-afaqrashid/cms-lab";
const NPM_URL = "https://www.npmjs.com/package/@cms-lab/cli";
const DOCS_URL = "https://cmslab.afaqrashid.com/docs";

export function renderAgentContextFiles(
  options: AgentContextOptions,
): AgentContextFile[] {
  const outputDir = trimSlashes(options.outputDir || ".cms-lab") || ".cms-lab";
  const contextPath = `${outputDir}/agent-context.md`;
  const promptPath = `${outputDir}/agent-prompt.md`;
  const files: AgentContextFile[] = [
    {
      path: contextPath,
      content: renderContextFile(options),
    },
    {
      path: promptPath,
      content: renderPromptFile(options),
    },
  ];

  if (options.includeAgentsMd) {
    files.unshift({
      path: "AGENTS.md",
      content: renderAgentsMd(contextPath, promptPath),
    });
  }

  return files;
}

function renderAgentsMd(contextPath: string, promptPath: string): string {
  return `# cms-lab agent handoff

This project uses cms-lab to check CMS content against the routes and fields the Next.js app expects.

Before changing code for CMS-related failures:

1. Read \`${contextPath}\` for the project scan model.
2. Read \`${promptPath}\` for a task prompt you can adapt.
3. Check the public cms-lab docs before guessing behavior:
   - GitHub: ${GITHUB_URL}
   - npm: ${NPM_URL}
   - Docs: ${DOCS_URL}
4. Run \`npx @cms-lab/cli@latest doctor\` before a first scan.
5. Run \`npx @cms-lab/cli@latest scan --ci --report\` to reproduce diagnostics.
6. Use \`npx @cms-lab/cli@latest explain <CODE>\` for diagnostic details.

Do not print or commit CMS tokens, webhook URLs, private site URLs, raw CMS payloads, or local absolute paths.
`;
}

function renderContextFile(options: AgentContextOptions): string {
  return `# cms-lab agent context

Use this file to orient coding agents before they work on CMS route, field, SEO, or report failures.

## Canonical references

- GitHub: ${GITHUB_URL}
- npm: ${NPM_URL}
- Docs: ${DOCS_URL}

## Project scan model

- Config file: ${options.configFile}
- Framework: ${projectLabel(options.project)}
- CMS provider: ${options.config.cms.provider}
- Site URL: configured in cms-lab config (redacted)

${cmsDetails(options.config.cms)}

## Route mappings

${routeMappings(options.config)}

## Checks

${checksSummary(options.config)}

## Recommended commands

\`\`\`sh
npx @cms-lab/cli@latest doctor
npx @cms-lab/cli@latest scan --ci --report
npx @cms-lab/cli@latest scan --json
npx @cms-lab/cli@latest explain CMS-ROUTE-404
\`\`\`

## Agent workflow

- Read the cms-lab config and this context before editing application code.
- Reproduce diagnostics with \`doctor\` or \`scan\` before changing behavior.
- Prefer fixing route mappings, CMS field assumptions, and template guards over hiding diagnostics.
- Keep generated reports and JSON output out of commits unless the team explicitly wants them.
- Do not expose CMS tokens, private URLs, webhook URLs, raw CMS payloads, or local absolute paths.
`;
}

function renderPromptFile(options: AgentContextOptions): string {
  return `# cms-lab agent prompt

You are working in a Next.js project that uses cms-lab to catch CMS-driven failures before deploy.

This prompt is suitable for agents such as Claude Code, Codex, Gemini CLI, Antigravity, OpenCode, and similar coding agents.

Start here:

1. Read the cms-lab docs: ${DOCS_URL}
2. Check the npm package usage: ${NPM_URL}
3. Check the source repository if behavior is unclear: ${GITHUB_URL}
4. Inspect the local cms-lab config: ${options.configFile}
5. Run:

\`\`\`sh
npx @cms-lab/cli@latest doctor
npx @cms-lab/cli@latest scan --ci --report
\`\`\`

Project facts:

- Framework: ${projectLabel(options.project)}
- CMS provider: ${options.config.cms.provider}
- Route mappings: ${options.config.routes.map((route) => `${route.type} -> ${route.pattern}`).join(", ")}

When diagnostics appear, use \`npx @cms-lab/cli@latest explain <CODE>\` before deciding whether the fix belongs in CMS content, route mapping, or application code.

Never reveal CMS tokens, private site URLs, webhook URLs, raw CMS payloads, or local absolute paths in commits, issues, pull requests, logs, or summaries.
`;
}

function cmsDetails(config: CmsProviderConfig): string {
  if (config.provider === "prismic") {
    return `## CMS details

- Repository: ${config.repositoryName}`;
  }

  if (config.provider === "strapi") {
    return `## CMS details

- Collections: ${config.collections.map((collection) => `${collection.type} (${collection.endpoint})`).join(", ")}`;
  }

  if (config.provider === "directus") {
    return `## CMS details

- Collections: ${config.collections.map((collection) => `${collection.type} (${collection.collection})`).join(", ")}`;
  }

  return `## CMS details

- Content types: ${(
    config.contentTypes ?? [
      { type: "page", endpoint: "pages" },
      { type: "post", endpoint: "posts" },
    ]
  )
    .map((contentType) => `${contentType.type} (${contentType.endpoint})`)
    .join(", ")}`;
}

function routeMappings(config: CmsLabConfig): string {
  return config.routes
    .map((route) => `- ${route.type} -> ${route.pattern}`)
    .join("\n");
}

function checksSummary(config: CmsLabConfig): string {
  const checks = config.checks;
  const lines = [
    `- Routes: ${checkState(checks?.routes)}`,
    `- SEO: ${checkState(checks?.seo)}`,
    `- Image alt text: ${checkState(checks?.a11y ?? checks?.images)}`,
    `- Required fields: ${requiredFieldsSummary(config)}`,
  ];

  return lines.join("\n");
}

function checkState(value: unknown): string {
  if (value === false) {
    return "disabled";
  }

  if (value === true || typeof value === "object") {
    return "enabled";
  }

  return "default";
}

function requiredFieldsSummary(config: CmsLabConfig): string {
  const fields = config.checks?.fields;
  if (!fields || typeof fields === "boolean") {
    return checkState(fields);
  }

  const required = fields.required ?? [];
  if (required.length === 0) {
    return "enabled";
  }

  return required
    .map(
      (field) => `${field.type}.${field.path} (${field.severity ?? "error"})`,
    )
    .join(", ");
}

function projectLabel(project: ProjectInfo): string {
  if (project.framework === "next" && project.router === "app") {
    return "Next.js App Router";
  }

  if (project.framework === "next" && project.router === "pages") {
    return "Next.js Pages Router";
  }

  return `${project.framework} ${project.router}`;
}

function trimSlashes(value: string): string {
  let start = 0;
  let end = value.length;

  while (start < end && value.charCodeAt(start) === 47) {
    start += 1;
  }

  while (end > start && value.charCodeAt(end - 1) === 47) {
    end -= 1;
  }

  return value.slice(start, end);
}
