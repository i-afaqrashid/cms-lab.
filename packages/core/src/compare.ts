import { diagnosticBaselineKey } from "./baseline.js";
import { summarizeDiagnostics } from "./diagnostics.js";
import type { Diagnostic, ScanSummary } from "./types.js";

/**
 * The shape of the diff between two cms-lab scan results.
 *
 * `added` diagnostics appear in `after` but not in `before`. `removed`
 * is the opposite. `unchanged` is the intersection. Counts mirror the
 * existing `ScanSummary` so callers can render the diff alongside
 * a normal scan summary without translating shapes.
 */
export type DiagnosticDiff = {
  added: Diagnostic[];
  removed: Diagnostic[];
  unchanged: Diagnostic[];
  summary: {
    added: ScanSummary;
    removed: ScanSummary;
    unchanged: ScanSummary;
  };
};

export function diffDiagnostics(
  before: Diagnostic[],
  after: Diagnostic[],
): DiagnosticDiff {
  const beforeKeys = new Map<string, Diagnostic>();
  for (const diagnostic of before) {
    beforeKeys.set(diagnosticBaselineKey(diagnostic), diagnostic);
  }

  const added: Diagnostic[] = [];
  const unchanged: Diagnostic[] = [];
  const seenAfter = new Set<string>();

  for (const diagnostic of after) {
    const key = diagnosticBaselineKey(diagnostic);
    seenAfter.add(key);
    if (beforeKeys.has(key)) {
      unchanged.push(diagnostic);
    } else {
      added.push(diagnostic);
    }
  }

  const removed: Diagnostic[] = [];
  for (const [key, diagnostic] of beforeKeys) {
    if (!seenAfter.has(key)) {
      removed.push(diagnostic);
    }
  }

  return {
    added,
    removed,
    unchanged,
    summary: {
      added: summarizeDiagnostics(added),
      removed: summarizeDiagnostics(removed),
      unchanged: summarizeDiagnostics(unchanged),
    },
  };
}
