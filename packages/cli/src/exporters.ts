import type { Diagnostic, FetchLike, ScanResult } from "@cms-lab/core";

export type ScanStatus = "passed" | "failed";

export function renderMarkdownSummary(
  result: ScanResult,
  status: ScanStatus,
): string {
  const lines = [
    `# cms-lab scan ${status}`,
    "",
    "| Errors | Warnings | Info | Documents |",
    "| ---: | ---: | ---: | ---: |",
    `| ${result.summary.errors} | ${result.summary.warnings} | ${result.summary.info} | ${result.documents.length} |`,
    "",
  ];

  if (result.diagnostics.length === 0) {
    lines.push("No diagnostics found.", "");
    return lines.join("\n");
  }

  const repeatedGroups = (result.diagnosticGroups ?? []).filter(
    (group) => group.count > 1,
  );
  if (repeatedGroups.length > 0) {
    lines.push("## Repeated Findings", "");
    lines.push("| Group | Code | Count | Examples |");
    lines.push("| --- | --- | ---: | --- |");
    for (const group of repeatedGroups) {
      lines.push(
        `| ${escapeMarkdown(group.label)} | ${escapeMarkdown(group.code)} | ${group.count} | ${escapeMarkdown(group.examples.join(", "))} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Diagnostics", "");
  lines.push("| Severity | Code | Message | Source |");
  lines.push("| --- | --- | --- | --- |");
  for (const diagnostic of result.diagnostics) {
    lines.push(
      `| ${escapeMarkdown(diagnostic.severity)} | ${escapeMarkdown(diagnostic.code)} | ${escapeMarkdown(diagnostic.message)} | ${escapeMarkdown(diagnostic.source ?? "")} |`,
    );
  }
  lines.push("");

  return lines.join("\n");
}

export function renderJUnitReport(result: ScanResult): string {
  const diagnostics =
    result.diagnostics.length > 0
      ? result.diagnostics
      : [
          {
            severity: "info" as const,
            code: "CMS-LAB-PASS",
            message: "cms-lab scan passed with no diagnostics",
          },
        ];
  const failures = result.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuite name="cms-lab" tests="${diagnostics.length}" failures="${failures.length}" errors="0">`,
    ...diagnostics.map((diagnostic) => renderJUnitTestcase(diagnostic)),
    "</testsuite>",
    "",
  ].join("\n");
}

export function renderSlackPayload(
  result: ScanResult,
  status: ScanStatus,
): {
  text: string;
} {
  const summary = `${result.summary.errors} ${plural(result.summary.errors, "error")}, ${result.summary.warnings} ${plural(result.summary.warnings, "warning")}, ${result.summary.info} ${plural(result.summary.info, "info item")}, ${result.documents.length} ${plural(result.documents.length, "document")}`;
  const codes = [
    ...new Set(result.diagnostics.map((diagnostic) => diagnostic.code)),
  ]
    .slice(0, 5)
    .join(", ");
  const suffix = codes ? ` Top codes: ${codes}.` : "";

  return {
    text: `cms-lab scan ${status}: ${summary}.${suffix}`,
  };
}

export async function postSlackPayload(options: {
  webhookUrl: string;
  fetchImpl?: FetchLike;
  payload: { text: string };
}): Promise<void> {
  const response = await (options.fetchImpl ?? fetch)(options.webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(options.payload),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook returned HTTP ${response.status}`);
  }
}

function renderJUnitTestcase(diagnostic: Diagnostic): string {
  const classname = `cms-lab.${groupForDiagnostic(diagnostic)}`;
  const name = diagnostic.code;

  if (diagnostic.severity === "error") {
    return `  <testcase classname="${escapeXml(classname)}" name="${escapeXml(name)}"><failure message="${escapeXml(diagnostic.message)}">${escapeXml(diagnostic.message)}</failure></testcase>`;
  }

  return `  <testcase classname="${escapeXml(classname)}" name="${escapeXml(name)}"><system-out>${escapeXml(diagnostic.message)}</system-out></testcase>`;
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

  if (diagnostic.code.startsWith("CMS-LOCALE")) {
    return "localization";
  }

  if (diagnostic.code.startsWith("SEO-")) {
    return "seo";
  }

  if (diagnostic.code.startsWith("A11Y-")) {
    return "a11y";
  }

  if (diagnostic.code.startsWith("CUSTOM")) {
    return "custom";
  }

  return "other";
}

function escapeMarkdown(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function plural(value: number, singular: string): string {
  return value === 1 ? singular : `${singular}s`;
}
