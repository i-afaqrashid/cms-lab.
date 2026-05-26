import type { Diagnostic, ScanResult } from "@cms-lab/core";

const LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="14" fill="#111110"/>
  <g transform="translate(16 16) scale(1.3333333)" stroke="#c8ea3a" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
    <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
    <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
    <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
    <circle cx="12" cy="12" r="3"/>
    <path d="m16 16-1.9-1.9"/>
  </g>
</svg>`;
const LOGO_DATA_URI = `data:image/svg+xml,${encodeURIComponent(LOGO_SVG)}`;

export type ReporterStatus = {
  available: true;
  format: "html";
};

export function getReporterStatus(): ReporterStatus {
  return {
    available: true,
    format: "html",
  };
}

export type HtmlReportPrivacy = "full" | "share";

export type HtmlReportOptions = {
  privacy?: HtmlReportPrivacy;
};

export function renderHtmlReport(
  result: ScanResult,
  options: HtmlReportOptions = {},
): string {
  const generatedAt = new Date().toISOString();
  const diagnostics = result.diagnostics;
  const privacy = options.privacy ?? "full";
  const status = result.summary.errors > 0 ? "failed" : "passed";
  const statusClass =
    result.summary.errors > 0
      ? "fail"
      : result.summary.warnings > 0
        ? "warn"
        : "ok";
  const grouped = groupDiagnostics(diagnostics);
  const documentStats = summarizeDocuments(result);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>cms-lab report</title>
  <link rel="icon" href="${LOGO_DATA_URI}" type="image/svg+xml">
  <link rel="shortcut icon" href="${LOGO_DATA_URI}" type="image/svg+xml">
  <link rel="apple-touch-icon" href="${LOGO_DATA_URI}">
  <style>
    :root {
      --bg: #f6f5ef;
      --surface: #ffffff;
      --surface-2: #fbfaf4;
      --ink: #111110;
      --ink-2: #2a2a26;
      --muted: #6b6b63;
      --border: #e4e1d6;
      --border-strong: #cfccc0;
      --accent: #c8ea3a;
      --error: #c0382a;
      --error-bg: #fbe7e3;
      --warning: #9a6a14;
      --warning-bg: #f9ecc9;
      --sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
      --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
      --maxw: 1120px;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: var(--sans);
      font-size: 16px;
      line-height: 1.55;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    h1, h2, h3, p { margin: 0; }
    h1, h2, h3 { font-weight: 600; letter-spacing: -0.012em; color: var(--ink); }
    code { font-family: var(--mono); font-size: 0.9em; }
    .page { min-height: 100vh; display: flex; flex-direction: column; }
    .page main { flex: 1; }
    .wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 28px; }
    .topbar {
      border-bottom: 1px solid var(--border);
      background: var(--bg);
      position: sticky;
      top: 0;
      z-index: 10;
      backdrop-filter: saturate(140%) blur(6px);
    }
    .topbar-inner {
      display: flex;
      align-items: center;
      gap: 14px;
      height: 56px;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--ink);
      font-weight: 600;
      flex: 0 0 auto;
    }
    .brand-mark {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      display: block;
      object-fit: cover;
      flex: 0 0 auto;
      box-shadow: 0 0 0 1px var(--border-strong);
    }
    .brand-name {
      font-family: var(--mono);
      font-size: 14px;
      white-space: nowrap;
    }
    .brand-version {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--muted);
      padding: 2px 6px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--surface);
    }
    .top-right {
      margin-left: auto;
      font-family: var(--mono);
      font-size: 12px;
      color: var(--muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta-line {
      font-family: var(--mono);
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 12px;
    }
    .report-shell {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
    }
    .report-head {
      padding: 22px 24px;
      border-bottom: 1px solid var(--border);
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }
    .report-title-block {
      display: grid;
      grid-template-columns: 56px 1fr;
      gap: 16px;
      align-items: center;
    }
    .report-logo {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: block;
      object-fit: cover;
      box-shadow: 0 0 0 1px var(--border-strong), 0 14px 24px -20px rgba(0,0,0,0.35);
    }
    .title-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .report-head h1 {
      font-size: 22px;
      line-height: 1.25;
      letter-spacing: -0.01em;
    }
    .subtitle {
      font-family: var(--mono);
      font-size: 12px;
      color: var(--muted);
      overflow-wrap: anywhere;
    }
    .badge {
      font-family: var(--mono);
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--muted);
    }
    .report-meta {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1px;
      background: var(--border);
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
    }
    .stat {
      background: var(--surface);
      padding: 16px;
    }
    .stat .k {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .stat .v {
      font-family: var(--mono);
      font-size: 22px;
      color: var(--ink);
      margin-top: 4px;
    }
    .stat .sub {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--muted);
      margin-top: 2px;
    }
    .stat.err .v { color: var(--error); }
    .report-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
      background: var(--surface-2);
      flex-wrap: wrap;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 9px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--surface);
      font-family: var(--mono);
      font-size: 12px;
      color: var(--ink-2);
      cursor: pointer;
    }
    button.chip { appearance: none; }
    .chip:focus-visible {
      outline: 2px solid var(--ink);
      outline-offset: 2px;
    }
    .chip .n { color: var(--muted); }
    .chip.active { background: var(--ink); color: #f6f5ef; border-color: var(--ink); }
    .chip.active .n { color: #b8b7ad; }
    .group-header {
      padding: 10px 20px;
      background: var(--surface-2);
      border-bottom: 1px solid var(--border);
      font-family: var(--mono);
      font-size: 12px;
      color: var(--muted);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .group-header .count { color: var(--ink-2); }
    .diagnostic-group.is-hidden,
    .diag.is-hidden {
      display: none;
    }
    .diag {
      display: grid;
      grid-template-columns: 32px 110px minmax(0, 1fr);
      gap: 12px;
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);
      align-items: start;
      font-size: 14px;
    }
    .diag > * { min-width: 0; }
    .diag:last-child { border-bottom: 0; }
    .diag .col-num {
      width: 18px;
      font-family: var(--mono);
      color: var(--muted);
      font-size: 12px;
      text-align: right;
    }
    .diag .sev {
      font-family: var(--mono);
      font-size: 11px;
      padding: 2px 0;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .diag .sev .marker {
      width: 9px;
      height: 9px;
      display: inline-block;
    }
    .diag.error .sev { color: var(--error); }
    .diag.error .sev .marker { background: var(--error); }
    .diag.warning .sev { color: var(--warning); }
    .diag.warning .sev .marker { background: var(--warning); }
    .diag.info .sev { color: var(--muted); }
    .diag.info .sev .marker { background: var(--muted); }
    .diag .msg {
      color: var(--ink);
      min-width: 0;
    }
    .diag .msg strong { font-weight: 600; }
    .diag .ctx {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 8px;
      margin-top: 5px;
      font-family: var(--mono);
      font-size: 12px;
      color: var(--muted);
      min-width: 0;
    }
    .diag .ctx span {
      display: inline;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .diag-code {
      display: inline-flex;
      white-space: nowrap;
      color: var(--ink-2);
    }
    .path-code {
      font-family: var(--mono);
      font-size: 12px;
      color: var(--ink-2);
      overflow-wrap: anywhere;
    }
    .empty-state {
      padding: 24px 20px;
      color: var(--muted);
      font-size: 14px;
    }
    .report-foot {
      padding: 14px 20px;
      border-top: 1px solid var(--border);
      background: var(--surface-2);
      font-family: var(--mono);
      font-size: 12px;
      color: var(--muted);
      display: flex;
      gap: 18px;
      flex-wrap: wrap;
    }
    .footer {
      padding: 36px 0 56px;
      color: var(--muted);
      font-size: 13px;
      border-top: 1px solid var(--border);
      background: var(--bg);
    }
    .muted { color: var(--muted); }
    @media (max-width: 820px) {
      .report-meta { grid-template-columns: 1fr 1fr; }
      .diag { grid-template-columns: 92px 1fr; }
      .diag .col-num { display: none; }
    }
    @media (max-width: 560px) {
      .wrap { padding: 0 16px; }
      .topbar-inner { gap: 10px; }
      .brand { gap: 7px; }
      .brand-mark { width: 30px; height: 30px; }
      .brand-name { font-size: 13px; }
      .brand-version { display: none; }
      .report-head { padding: 20px; }
      .report-title-block {
        grid-template-columns: 48px 1fr;
        gap: 12px;
      }
      .report-logo {
        width: 48px;
        height: 48px;
      }
      .report-meta .stat { padding: 14px 16px; }
      .report-toolbar { padding: 12px 16px; }
      .diag {
        grid-template-columns: 1fr;
        gap: 6px;
        padding: 14px 16px;
      }
      .diag .sev { padding: 0; }
    }
  </style>
</head>
<body class="page">
  <header class="topbar">
    <div class="wrap topbar-inner">
      <span class="brand" aria-label="cms-lab">
        <img class="brand-mark" src="${LOGO_DATA_URI}" width="34" height="34" alt="" aria-hidden="true">
        <span class="brand-name">cms-lab</span>
        <span class="brand-version">report</span>
      </span>
      <div class="top-right">.cms-lab/report.html</div>
    </div>
  </header>
  <main>
    <div class="wrap" style="padding-top:32px; padding-bottom:64px;">
      <div class="meta-line">cms-lab report · generated ${escapeHtml(generatedAt)}</div>

      <div class="report-shell">
        <div class="report-head">
          <div class="report-title-block">
            <img class="report-logo" src="${LOGO_DATA_URI}" width="56" height="56" alt="cms-lab logo">
            <div>
              <div class="title-row">
                <h1>${escapeHtml(capitalize(`scan ${status}`))}</h1>
                <span class="badge ${statusClass}">${escapeHtml(statusLabel(result))}</span>
                ${result.summary.warnings > 0 ? `<span class="badge warn">${result.summary.warnings} ${escapeHtml(plural(result.summary.warnings, "warning"))}</span>` : ""}
                ${result.summary.info > 0 ? `<span class="badge info">${result.summary.info} ${escapeHtml(plural(result.summary.info, "info item"))}</span>` : ""}
                ${privacy === "share" ? `<span class="badge">Share-safe report</span>` : ""}
              </div>
              <div class="subtitle">
                ${escapeHtml(projectLabel(result))} · ${result.documents.length} ${escapeHtml(plural(result.documents.length, "document"))}
              </div>
            </div>
          </div>
        </div>

        <div class="report-meta">
          <div class="stat err"><div class="k">Errors</div><div class="v">${result.summary.errors}</div></div>
          <div class="stat warn"><div class="k">Warnings</div><div class="v">${result.summary.warnings}</div></div>
          <div class="stat info"><div class="k">Info</div><div class="v">${result.summary.info}</div></div>
          <div class="stat"><div class="k">Documents</div><div class="v">${result.documents.length}</div></div>
          ${
            documentStats.hasEntryKinds
              ? `<div class="stat"><div class="k">Collections</div><div class="v">${documentStats.collections}</div><div class="sub">${documentStats.collections} ${escapeHtml(plural(documentStats.collections, "collection"))}</div></div>
          <div class="stat"><div class="k">Single types</div><div class="v">${documentStats.singleTypes}</div><div class="sub">${documentStats.singleTypes} ${escapeHtml(plural(documentStats.singleTypes, "single type"))}</div></div>`
              : ""
          }
        </div>

        <div class="report-toolbar" aria-label="Diagnostic filters">
          <button class="chip active" type="button" data-filter-kind="all" data-filter-value="all">All <span class="n">${diagnostics.length}</span></button>
          <button class="chip" type="button" data-filter-kind="severity" data-filter-value="error">Errors <span class="n">${result.summary.errors}</span></button>
          <button class="chip" type="button" data-filter-kind="severity" data-filter-value="warning">Warnings <span class="n">${result.summary.warnings}</span></button>
          <button class="chip" type="button" data-filter-kind="severity" data-filter-value="info">Info <span class="n">${result.summary.info}</span></button>
          ${grouped.map((group) => `<button class="chip" type="button" data-filter-kind="group" data-filter-value="${escapeHtml(group.label)}">${escapeHtml(group.label)} <span class="n">${group.diagnostics.length}</span></button>`).join("")}
        </div>

        ${diagnostics.length === 0 ? `<div class="empty-state">No diagnostics found.</div>` : grouped.map((group) => diagnosticsGroup(group, result, privacy)).join("")}

        <div class="report-foot">
          <span>project: <span class="path-code">${escapeHtml(result.project.framework)} ${escapeHtml(result.project.router)}</span></span>
          <span>documents: ${result.documents.length}</span>
          <span>diagnostics: ${diagnostics.length}</span>
          <span>generated: ${escapeHtml(generatedAt)}</span>
        </div>
      </div>
    </div>
  </main>
  <footer class="footer">
    <div class="wrap">Generated by cms-lab</div>
  </footer>
  <script>
    (() => {
      const chips = [...document.querySelectorAll("[data-filter-kind]")];
      const groups = [...document.querySelectorAll("[data-diagnostic-group]")];

      function applyFilter(kind, value) {
        chips.forEach((chip) => {
          chip.classList.toggle("active", chip.dataset.filterKind === kind && chip.dataset.filterValue === value);
        });

        groups.forEach((group) => {
          let visibleCount = 0;
          group.querySelectorAll("[data-diagnostic]").forEach((diagnostic) => {
            const visible =
              kind === "all" ||
              (kind === "severity" && diagnostic.dataset.severity === value) ||
              (kind === "group" && diagnostic.dataset.group === value);

            diagnostic.classList.toggle("is-hidden", !visible);
            if (visible) {
              visibleCount += 1;
            }
          });

          group.classList.toggle("is-hidden", visibleCount === 0);
          const count = group.querySelector("[data-visible-count]");
          if (count) {
            count.textContent = visibleCount + " " + (visibleCount === 1 ? "diagnostic" : "diagnostics");
          }
        });
      }

      chips.forEach((chip) => {
        chip.addEventListener("click", () => {
          applyFilter(chip.dataset.filterKind || "all", chip.dataset.filterValue || "all");
        });
      });
    })();
  </script>
</body>
</html>
`;
}

type DiagnosticGroup = {
  label: string;
  diagnostics: Diagnostic[];
};

type DocumentStats = {
  collections: number;
  singleTypes: number;
  hasEntryKinds: boolean;
};

function summarizeDocuments(result: ScanResult): DocumentStats {
  const collections = result.documents.filter(
    (document) => document.entryKind === "collection",
  ).length;
  const singleTypes = result.documents.filter(
    (document) => document.entryKind === "single",
  ).length;

  return {
    collections,
    singleTypes,
    hasEntryKinds: collections > 0 || singleTypes > 0,
  };
}

function statusLabel(result: ScanResult): string {
  if (result.summary.errors > 0) {
    return `${result.summary.errors} ${plural(result.summary.errors, "error")}`;
  }

  if (result.summary.warnings > 0) {
    return `${result.summary.warnings} ${plural(result.summary.warnings, "warning")}`;
  }

  return "no errors";
}

function plural(value: number, singular: string): string {
  return value === 1 ? singular : `${singular}s`;
}

function groupDiagnostics(diagnostics: Diagnostic[]): DiagnosticGroup[] {
  const groupOrder = [
    "routes",
    "fields",
    "relationships",
    "seo",
    "a11y",
    "other",
  ];
  const groups = new Map<string, Diagnostic[]>();

  for (const diagnostic of diagnostics) {
    const group = groupForDiagnostic(diagnostic);
    groups.set(group, [...(groups.get(group) ?? []), diagnostic]);
  }

  return groupOrder
    .map((label) => ({ label, diagnostics: groups.get(label) ?? [] }))
    .filter((group) => group.diagnostics.length > 0);
}

function groupForDiagnostic(diagnostic: Diagnostic): string {
  if (
    diagnostic.code.startsWith("CMS-ROUTE") ||
    diagnostic.code === "CMS-UID-MISSING"
  ) {
    return "routes";
  }

  if (diagnostic.code.startsWith("CMS-FIELD")) {
    return "fields";
  }

  if (diagnostic.code.startsWith("CMS-RELATIONSHIP")) {
    return "relationships";
  }

  if (diagnostic.code.startsWith("SEO-")) {
    return "seo";
  }

  if (diagnostic.code.startsWith("A11Y-")) {
    return "a11y";
  }

  return "other";
}

function diagnosticsGroup(
  group: DiagnosticGroup,
  result: ScanResult,
  privacy: HtmlReportPrivacy,
): string {
  return `<section class="diagnostic-group" data-diagnostic-group="${escapeHtml(group.label)}">
  <div class="group-header">
    <span>${escapeHtml(group.label)}</span> · <span class="count" data-visible-count>${group.diagnostics.length} ${escapeHtml(plural(group.diagnostics.length, "diagnostic"))}</span>
  </div>
  ${group.diagnostics.map((diagnostic, index) => diagnosticRow(diagnostic, group.label, index + 1, result, privacy)).join("")}
  </section>`;
}

function diagnosticRow(
  diagnostic: Diagnostic,
  group: string,
  index: number,
  result: ScanResult,
  privacy: HtmlReportPrivacy,
): string {
  const path = diagnostic.path
    ? redactReportValue(diagnostic.path, result, privacy)
    : undefined;
  const message = redactReportValue(diagnostic.message, result, privacy);
  const source =
    privacy === "share"
      ? diagnostic.source
        ? "[redacted CMS source]"
        : undefined
      : diagnostic.source;

  return `<div class="diag ${escapeHtml(diagnostic.severity)}" data-diagnostic data-group="${escapeHtml(group)}" data-severity="${escapeHtml(diagnostic.severity)}">
    <div class="col-num">${index}</div>
    <div class="sev"><span class="marker"></span>${escapeHtml(diagnostic.severity)}</div>
    <div class="msg">
      ${path ? `<strong>${escapeHtml(path)}</strong> ` : ""}${escapeHtml(message)}
      <span class="ctx"><span class="diag-code">${escapeHtml(diagnostic.code)}</span>${source ? ` <span aria-hidden="true">·</span> <span>${escapeHtml(source)}</span>` : ""}</span>
    </div>
  </div>`;
}

function redactReportValue(
  value: string,
  result: ScanResult,
  privacy: HtmlReportPrivacy,
): string {
  if (privacy !== "share") {
    return value;
  }

  let redacted = value;
  const projectPaths = [
    result.project.appDir,
    result.project.pagesDir,
    result.project.rootDir,
  ]
    .filter((path): path is string => Boolean(path))
    .sort((a, b) => b.length - a.length);

  for (const projectPath of projectPaths) {
    redacted = redacted.replaceAll(projectPath, "[redacted project path]");
  }

  return redacted
    .replaceAll(
      /(?:\/Users|\/private\/var|\/var\/folders)\/[^\s<>"')]+/g,
      "[redacted project path]",
    )
    .replaceAll(/[A-Z]:\\Users\\[^\s<>"')]+/gi, "[redacted project path]");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function projectLabel(result: ScanResult): string {
  if (result.project.framework === "next" && result.project.router === "app") {
    return "Next.js App Router";
  }

  return `${result.project.framework} ${result.project.router} router`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
