import { diffDiagnostics } from "@cms-lab/core";
import type { Diagnostic } from "@cms-lab/core";

const error: Diagnostic = {
  severity: "error",
  code: "CMS-ROUTE-404",
  message: "Route /about returned 404",
  path: "/about",
  source: "prismic:page#about",
};

const warning: Diagnostic = {
  severity: "warning",
  code: "SEO-META-MISSING",
  message: "Document about is missing meta_title",
  source: "prismic:page#about",
};

const newError: Diagnostic = {
  severity: "error",
  code: "CMS-ROUTE-500",
  message: "Route /pricing returned 503",
  path: "/pricing",
  source: "prismic:page#pricing",
};

test("diffDiagnostics finds added diagnostics that the baseline does not have", () => {
  const diff = diffDiagnostics([error], [error, newError]);
  expect(diff.added).toEqual([newError]);
  expect(diff.removed).toEqual([]);
  expect(diff.unchanged).toEqual([error]);
  expect(diff.summary.added.errors).toBe(1);
  expect(diff.summary.unchanged.errors).toBe(1);
});

test("diffDiagnostics finds removed diagnostics that have been fixed", () => {
  const diff = diffDiagnostics([error, warning], [warning]);
  expect(diff.added).toEqual([]);
  expect(diff.removed).toEqual([error]);
  expect(diff.unchanged).toEqual([warning]);
  expect(diff.summary.removed.errors).toBe(1);
  expect(diff.summary.unchanged.warnings).toBe(1);
});

test("diffDiagnostics returns empty diffs when before and after match", () => {
  const diff = diffDiagnostics([error, warning], [error, warning]);
  expect(diff.added).toEqual([]);
  expect(diff.removed).toEqual([]);
  expect(diff.unchanged).toHaveLength(2);
});

test("diffDiagnostics treats severity / code / path / source as the identity", () => {
  const before: Diagnostic = {
    severity: "warning",
    code: "X",
    message: "old text",
    path: "/p",
    source: "src",
  };
  const after: Diagnostic = {
    severity: "warning",
    code: "X",
    message: "new text", // message changed only
    path: "/p",
    source: "src",
  };

  const diff = diffDiagnostics([before], [after]);
  expect(diff.added).toEqual([]);
  expect(diff.removed).toEqual([]);
  expect(diff.unchanged).toEqual([after]);
});
