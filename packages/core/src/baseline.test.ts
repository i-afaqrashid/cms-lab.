import {
  applyBaseline,
  diagnosticBaselineKey,
  makeBaseline,
  parseBaseline,
} from "@cms-lab/core";
import type { Diagnostic } from "@cms-lab/core";

const sampleDiagnostics: Diagnostic[] = [
  {
    severity: "error",
    code: "CMS-ROUTE-404",
    message: "Route /about returned 404",
    path: "/about",
    source: "prismic:page#about-doc",
  },
  {
    severity: "warning",
    code: "SEO-META-MISSING",
    message: "Document about-doc is missing meta_title",
    source: "prismic:page#about-doc",
  },
  {
    severity: "info",
    code: "CMS-ROUTE-UNMAPPED",
    message: "Document settings-doc has no configured route mapping",
    source: "prismic:settings#settings-doc",
  },
];

test("diagnosticBaselineKey is stable across runs and ignores message", () => {
  const a = diagnosticBaselineKey({
    severity: "error",
    code: "CMS-ROUTE-404",
    path: "/about",
    source: "prismic:page#about-doc",
  });
  const b = diagnosticBaselineKey({
    severity: "error",
    code: "CMS-ROUTE-404",
    path: "/about",
    source: "prismic:page#about-doc",
  });
  expect(a).toBe(b);
});

test("diagnosticBaselineKey differs when severity / code / path / source differ", () => {
  const base = {
    severity: "error" as const,
    code: "CMS-ROUTE-404",
    path: "/about",
    source: "prismic:page#about-doc",
  };
  expect(diagnosticBaselineKey(base)).not.toBe(
    diagnosticBaselineKey({ ...base, severity: "warning" }),
  );
  expect(diagnosticBaselineKey(base)).not.toBe(
    diagnosticBaselineKey({ ...base, code: "CMS-ROUTE-500" }),
  );
  expect(diagnosticBaselineKey(base)).not.toBe(
    diagnosticBaselineKey({ ...base, path: "/contact" }),
  );
  expect(diagnosticBaselineKey(base)).not.toBe(
    diagnosticBaselineKey({ ...base, source: "prismic:page#other-doc" }),
  );
});

test("makeBaseline + parseBaseline round-trip through JSON", () => {
  const baseline = makeBaseline(sampleDiagnostics);
  const text = JSON.stringify(baseline);
  const parsed = parseBaseline(JSON.parse(text));
  expect(parsed.version).toBe(1);
  expect(parsed.entries).toHaveLength(sampleDiagnostics.length);
  expect(parsed.entries[0]).toMatchObject({
    severity: "error",
    code: "CMS-ROUTE-404",
    path: "/about",
    source: "prismic:page#about-doc",
  });
});

test("parseBaseline rejects unsupported versions", () => {
  expect(() =>
    parseBaseline({ version: 2, createdAt: "now", entries: [] }),
  ).toThrow(/version 2 is not supported/);
});

test("parseBaseline rejects missing entries array", () => {
  expect(() => parseBaseline({ version: 1, createdAt: "now" })).toThrow(
    /missing an entries array/,
  );
});

test("parseBaseline skips malformed entries", () => {
  const parsed = parseBaseline({
    version: 1,
    createdAt: "now",
    entries: [
      { severity: "error", code: "CMS-ROUTE-404" },
      { severity: "bogus", code: "X" },
      "not an object",
      { code: "missing-severity" },
      null,
    ],
  });
  expect(parsed.entries).toHaveLength(1);
});

test("applyBaseline subtracts matching diagnostics and counts suppressed", () => {
  const baseline = makeBaseline([sampleDiagnostics[0], sampleDiagnostics[2]]);
  const next: Diagnostic[] = [
    sampleDiagnostics[0],
    sampleDiagnostics[1],
    sampleDiagnostics[2],
  ];

  const { remaining, suppressed } = applyBaseline(next, baseline);

  expect(suppressed).toBe(2);
  expect(remaining).toEqual([sampleDiagnostics[1]]);
});

test("applyBaseline keeps net-new diagnostics", () => {
  const baseline = makeBaseline([sampleDiagnostics[0]]);
  const next: Diagnostic[] = [
    sampleDiagnostics[0],
    {
      severity: "error",
      code: "CMS-ROUTE-500",
      message: "Route /pricing returned 503",
      path: "/pricing",
      source: "prismic:page#pricing-doc",
    },
  ];

  const { remaining, suppressed } = applyBaseline(next, baseline);

  expect(suppressed).toBe(1);
  expect(remaining).toHaveLength(1);
  expect(remaining[0].code).toBe("CMS-ROUTE-500");
});

test("applyBaseline with null baseline is a no-op", () => {
  const { remaining, suppressed } = applyBaseline(sampleDiagnostics, null);
  expect(suppressed).toBe(0);
  expect(remaining).toEqual(sampleDiagnostics);
});
