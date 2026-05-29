import { createDiagnostic } from "./diagnostics.js";
import { readCmsDataPath } from "./data-path.js";
import type {
  CMSDocument,
  CmsLabConfig,
  CustomAssertion,
  CustomDeclarativeRule,
  CustomRuleContext,
  CustomRuleFn,
  Diagnostic,
  DiagnosticSeverity,
} from "./types.js";

export const DEFAULT_CUSTOM_RULE_CODE = "CUSTOM-RULE";

export type EvaluateCustomRulesOptions = {
  /** Reference time for date assertions. Defaults to `Date.now()`. */
  now?: number;
};

/**
 * Run every configured custom rule against the fetched documents and return
 * the diagnostics they produce. Declarative rules are evaluated against the
 * value at `path`; functional rules receive each document plus a context with
 * `error`/`warning`/`info` helpers.
 */
export function evaluateCustomRules(
  config: CmsLabConfig,
  documents: CMSDocument[],
  options: EvaluateCustomRulesOptions = {},
): Diagnostic[] {
  const rules = config.checks?.custom ?? [];
  if (rules.length === 0) {
    return [];
  }

  const now = options.now ?? Date.now();
  const diagnostics: Diagnostic[] = [];

  for (const document of documents) {
    for (const rule of rules) {
      if (typeof rule === "function") {
        diagnostics.push(
          ...runFunctionalRule(rule, document, documents, config),
        );
        continue;
      }

      const diagnostic = runDeclarativeRule(rule, document, config, now);
      if (diagnostic) {
        diagnostics.push(diagnostic);
      }
    }
  }

  return diagnostics;
}

function runFunctionalRule(
  rule: CustomRuleFn,
  document: CMSDocument,
  documents: CMSDocument[],
  config: CmsLabConfig,
): Diagnostic[] {
  const collected: Diagnostic[] = [];
  const emit =
    (severity: DiagnosticSeverity) =>
    (code: string, message: string, emitOptions?: { path?: string }) => {
      collected.push(
        createDiagnostic({
          severity,
          code: code.trim() || DEFAULT_CUSTOM_RULE_CODE,
          message,
          ...(emitOptions?.path ? { path: emitOptions.path } : {}),
          source: sourceFor(config, document),
        }),
      );
    };

  const context: CustomRuleContext = {
    document,
    documents,
    config,
    readPath: (path: string) => readCmsDataPath(document.data, path),
    error: emit("error"),
    warning: emit("warning"),
    info: emit("info"),
  };

  rule(document, context);
  return collected;
}

function runDeclarativeRule(
  rule: CustomDeclarativeRule,
  document: CMSDocument,
  config: CmsLabConfig,
  now: number,
): Diagnostic | undefined {
  if (rule.type !== document.type) {
    return undefined;
  }

  if (!matchesFilter(document, rule.filter)) {
    return undefined;
  }

  const value = readCmsDataPath(document.data, rule.path);
  if (satisfiesAssertion(value, rule.assert, now)) {
    return undefined;
  }

  const fullPath = `data.${rule.path}`;
  return createDiagnostic({
    severity: rule.severity ?? "error",
    code: rule.code?.trim() || DEFAULT_CUSTOM_RULE_CODE,
    message:
      rule.message ??
      `Document ${document.id} failed custom rule on ${fullPath} (${describeAssertion(rule.assert)})`,
    path: fullPath,
    source: sourceFor(config, document),
  });
}

function matchesFilter(
  document: CMSDocument,
  filter: CustomDeclarativeRule["filter"],
): boolean {
  if (!filter) {
    return true;
  }

  return Object.entries(filter).every(([path, expected]) => {
    const actual = readCmsDataPath(document.data, path);
    return actual === expected || String(actual) === String(expected);
  });
}

/**
 * Returns true when `value` satisfies the assertion (i.e. the rule passes).
 * Each constraint in the object form must hold; a missing value passes only
 * the explicit "must be absent" checks (there are none today, so a missing
 * value fails everything except when no constraint inspects it).
 */
export function satisfiesAssertion(
  value: unknown,
  assertion: CustomAssertion,
  now: number,
): boolean {
  const normalized = normalizeAssertion(assertion);

  if (normalized.present && isMissing(value)) {
    return false;
  }

  if (normalized.gt !== undefined && !(toNumber(value) > normalized.gt)) {
    return false;
  }
  if (normalized.gte !== undefined && !(toNumber(value) >= normalized.gte)) {
    return false;
  }
  if (normalized.lt !== undefined && !(toNumber(value) < normalized.lt)) {
    return false;
  }
  if (normalized.lte !== undefined && !(toNumber(value) <= normalized.lte)) {
    return false;
  }

  if (
    normalized.oneOf &&
    !normalized.oneOf.some((item) => String(item) === String(value))
  ) {
    return false;
  }

  if (normalized.matches !== undefined) {
    if (
      typeof value !== "string" ||
      !new RegExp(normalized.matches).test(value)
    ) {
      return false;
    }
  }

  if (normalized.notMatches !== undefined) {
    if (
      typeof value === "string" &&
      new RegExp(normalized.notMatches).test(value)
    ) {
      return false;
    }
  }

  if (
    normalized.minLength !== undefined ||
    normalized.maxLength !== undefined
  ) {
    const length = lengthOf(value);
    if (length === undefined) {
      return false;
    }
    if (normalized.minLength !== undefined && length < normalized.minLength) {
      return false;
    }
    if (normalized.maxLength !== undefined && length > normalized.maxLength) {
      return false;
    }
  }

  if (normalized.futureDate) {
    const time = toTime(value);
    if (time === undefined || time <= now) {
      return false;
    }
  }

  if (normalized.pastDate) {
    const time = toTime(value);
    if (time === undefined || time >= now) {
      return false;
    }
  }

  if (normalized.newerThan !== undefined) {
    const threshold = now - durationMs(normalized.newerThan);
    const time = toTime(value);
    if (time === undefined || time < threshold) {
      return false;
    }
  }

  if (normalized.olderThan !== undefined) {
    const threshold = now - durationMs(normalized.olderThan);
    const time = toTime(value);
    if (time === undefined || time > threshold) {
      return false;
    }
  }

  return true;
}

type NormalizedAssertion = Exclude<CustomAssertion, string>;

function normalizeAssertion(assertion: CustomAssertion): NormalizedAssertion {
  if (assertion === "present") {
    return { present: true };
  }
  if (assertion === "futureDate") {
    return { futureDate: true };
  }
  if (assertion === "pastDate") {
    return { pastDate: true };
  }
  return assertion;
}

function describeAssertion(assertion: CustomAssertion): string {
  if (typeof assertion === "string") {
    return assertion;
  }

  const parts = Object.entries(assertion)
    .filter(([, value]) => value !== undefined && value !== false)
    .map(([key, value]) =>
      typeof value === "boolean" ? key : `${key}=${JSON.stringify(value)}`,
    );
  return parts.join(", ") || "assertion";
}

function isMissing(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }
  return Number.NaN;
}

function lengthOf(value: unknown): number | undefined {
  if (typeof value === "string" || Array.isArray(value)) {
    return value.length;
  }
  return undefined;
}

function toTime(value: unknown): number | undefined {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? undefined : time;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const time = Date.parse(value);
    return Number.isNaN(time) ? undefined : time;
  }
  return undefined;
}

const DURATION_UNITS_MS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  min: 60_000,
  h: 3_600_000,
  hr: 3_600_000,
  d: 86_400_000,
  day: 86_400_000,
  days: 86_400_000,
  w: 604_800_000,
  week: 604_800_000,
  weeks: 604_800_000,
  mo: 2_592_000_000,
  month: 2_592_000_000,
  months: 2_592_000_000,
  y: 31_536_000_000,
  year: 31_536_000_000,
  years: 31_536_000_000,
};

/**
 * Parse a relative duration like `12months`, `30d`, `2 weeks`, `1y` into
 * milliseconds. Months are treated as 30 days and years as 365 days, which
 * is precise enough for staleness windows. Unknown shapes return 0.
 */
export function durationMs(input: string): number {
  const match = /^\s*(\d+(?:\.\d+)?)\s*([a-z]+)\s*$/i.exec(input);
  if (!match) {
    return 0;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitMs = DURATION_UNITS_MS[unit];
  if (!Number.isFinite(amount) || unitMs === undefined) {
    return 0;
  }

  return amount * unitMs;
}

function sourceFor(config: CmsLabConfig, document: CMSDocument): string {
  return `${config.cms.provider}:${document.type}#${document.id}`;
}
