import pc from "picocolors";
import type {
  Diagnostic,
  DiagnosticGroupSummary,
  ScanResult,
} from "@cms-lab/core";

export type FormatOutputOptions = {
  color?: boolean;
  failOn?: "error" | "warning" | "never";
  maxWarnings?: number;
  maxInfo?: number;
  hints?: boolean;
};

export function formatPrettyResult(
  result: ScanResult,
  options: FormatOutputOptions = {},
): string {
  const color = options.color ?? false;
  const paint = color ? pc : noColor;
  const failOn = options.failOn ?? "error";
  const thresholdFailure = thresholdFailureMessage(result, options);
  const lines: string[] = [];

  lines.push(paint.bold("cms-lab"));
  lines.push(`project ${result.project.framework} ${result.project.router}`);
  lines.push(`documents ${result.documents.length}`);
  lines.push("");

  appendGroup(
    lines,
    "errors",
    result.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    paint.red,
  );
  appendGroup(
    lines,
    "warnings",
    result.diagnostics.filter(
      (diagnostic) => diagnostic.severity === "warning",
    ),
    paint.yellow,
  );
  appendGroup(
    lines,
    "info",
    result.diagnostics.filter((diagnostic) => diagnostic.severity === "info"),
    paint.cyan,
  );

  appendRepeatedGroups(lines, result.diagnosticGroups ?? [], paint.bold);

  lines.push("");
  lines.push("summary");
  lines.push(`  errors   ${result.summary.errors}`);
  lines.push(`  warnings ${result.summary.warnings}`);
  lines.push(`  info     ${result.summary.info}`);
  lines.push("");
  if (result.summary.errors > 0 && failOn !== "never") {
    lines.push(
      paint.red(
        `scan failed - ${result.summary.errors} ${plural(result.summary.errors, "error")}`,
      ),
    );
  } else if (failOn === "warning" && result.summary.warnings > 0) {
    lines.push(
      paint.yellow(
        `scan failed - ${result.summary.warnings} ${plural(result.summary.warnings, "warning")}`,
      ),
    );
  } else if (thresholdFailure) {
    lines.push(paint.red(thresholdFailure));
  } else if (
    failOn === "never" &&
    (result.summary.errors > 0 || result.summary.warnings > 0)
  ) {
    lines.push(
      paint.cyan("scan completed - diagnostics ignored by --fail-on never"),
    );
  } else {
    lines.push(paint.green("scan passed"));
  }

  if (options.hints && result.diagnostics.length > 0) {
    lines.push("");
    lines.push("next");
    lines.push(`  cms-lab explain ${result.diagnostics[0].code}`);
  }

  return `${lines.join("\n")}\n`;
}

function thresholdFailureMessage(
  result: ScanResult,
  options: FormatOutputOptions,
): string | undefined {
  if (
    options.maxWarnings !== undefined &&
    result.summary.warnings > options.maxWarnings
  ) {
    return `scan failed - ${result.summary.warnings} ${plural(result.summary.warnings, "warning")} exceed --max-warnings ${options.maxWarnings}`;
  }

  if (options.maxInfo !== undefined && result.summary.info > options.maxInfo) {
    return `scan failed - ${result.summary.info} ${plural(result.summary.info, "info item")} exceed --max-info ${options.maxInfo}`;
  }

  return undefined;
}

function appendGroup(
  lines: string[],
  title: string,
  diagnostics: Diagnostic[],
  color: (value: string) => string,
): void {
  if (diagnostics.length === 0) {
    return;
  }

  lines.push(title);
  for (const diagnostic of diagnostics) {
    const location = diagnostic.path ? ` ${diagnostic.path}` : "";
    const source = diagnostic.source ? ` (${diagnostic.source})` : "";
    lines.push(
      `  ${color(diagnostic.code)}${location} - ${diagnostic.message}${source}`,
    );
  }
  lines.push("");
}

function appendRepeatedGroups(
  lines: string[],
  groups: DiagnosticGroupSummary[],
  formatTitle: (value: string) => string,
): void {
  const repeated = groups.filter((group) => group.count > 1);
  if (repeated.length === 0) {
    return;
  }

  lines.push(formatTitle("repeated"));
  for (const group of repeated) {
    const examples =
      group.examples.length > 0 ? ` (${group.examples.join(", ")})` : "";
    lines.push(`  ${group.label} - ${group.code} x${group.count}${examples}`);
  }
  lines.push("");
}

function plural(value: number, singular: string): string {
  return value === 1 ? singular : `${singular}s`;
}

const noColor = {
  bold: (value: string) => value,
  red: (value: string) => value,
  yellow: (value: string) => value,
  cyan: (value: string) => value,
  green: (value: string) => value,
};
