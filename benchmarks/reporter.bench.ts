import { bench, describe } from "vitest";
import type { CMSDocument, Diagnostic, ScanResult } from "@cms-lab/core";
import { renderHtmlReport } from "@cms-lab/reporter";

const options = {
  time: 250,
  iterations: 8,
  warmupTime: 50,
  warmupIterations: 3,
};

const result = createResult(500, 250);

describe("reporter", () => {
  bench(
    "renderHtmlReport: 500 documents and 250 diagnostics",
    () => {
      renderHtmlReport(result);
    },
    options,
  );
});

function createResult(
  documentCount: number,
  diagnosticCount: number,
): ScanResult {
  const documents: CMSDocument[] = Array.from(
    { length: documentCount },
    (_, index) => ({
      id: `doc-${index}`,
      type: index % 5 === 0 ? "article" : "page",
      uid: `doc-${index}`,
      status: index % 11 === 0 ? "draft" : "published",
      data: {
        title: `Document ${index}`,
        meta_title: index % 3 === 0 ? "" : `Document ${index}`,
        meta_description: `Benchmark document ${index}`,
      },
    }),
  );
  const diagnostics: Diagnostic[] = Array.from(
    { length: diagnosticCount },
    (_, index) => diagnosticFor(index),
  );

  return {
    project: {
      framework: "next",
      router: "app",
      rootDir: "/benchmark-site",
      appDir: "/benchmark-site/app",
    },
    documents,
    diagnostics,
    summary: {
      errors: diagnostics.filter(
        (diagnostic) => diagnostic.severity === "error",
      ).length,
      warnings: diagnostics.filter(
        (diagnostic) => diagnostic.severity === "warning",
      ).length,
      info: diagnostics.filter((diagnostic) => diagnostic.severity === "info")
        .length,
    },
  };
}

function diagnosticFor(index: number): Diagnostic {
  const severity =
    index % 7 === 0 ? "info" : index % 3 === 0 ? "error" : "warning";
  const code =
    severity === "error"
      ? "CMS-ROUTE-404"
      : severity === "info"
        ? "CMS-ROUTE-UNMAPPED"
        : index % 2 === 0
          ? "SEO-META-MISSING"
          : "A11Y-IMG-ALT";

  return {
    severity,
    code,
    message: `Benchmark diagnostic ${index}`,
    path: severity === "error" ? `/doc-${index}` : undefined,
    source: `page#doc-${index}`,
  };
}
