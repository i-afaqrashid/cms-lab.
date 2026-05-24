import type {
  Diagnostic,
  DiagnosticExplanation,
  DiagnosticSeverity,
  ScanSummary,
} from "./types.js";

export function createDiagnostic(input: Diagnostic): Diagnostic {
  return input;
}

export function summarizeDiagnostics(diagnostics: Diagnostic[]): ScanSummary {
  return {
    errors: countSeverity(diagnostics, "error"),
    warnings: countSeverity(diagnostics, "warning"),
    info: countSeverity(diagnostics, "info"),
  };
}

function countSeverity(
  diagnostics: Diagnostic[],
  severity: DiagnosticSeverity,
): number {
  return diagnostics.filter((diagnostic) => diagnostic.severity === severity)
    .length;
}

const explanations: DiagnosticExplanation[] = [
  {
    code: "CMS-UID-MISSING",
    severity: "error",
    title: "CMS document is missing a UID",
    meaning:
      "A route pattern requires :uid, but the CMS document does not have a usable uid value.",
    fix: "Publish the document with a UID, or change the cms-lab route mapping so this content type does not depend on :uid.",
  },
  {
    code: "CMS-ROUTE-404",
    severity: "error",
    title: "CMS route returned 404",
    meaning:
      "The route mapping resolved to a URL, but the running site returned a not-found response for that CMS document.",
    fix: "Check generateStaticParams, dynamicParams, CMS fetch logic, and the getPath mapping for this content type.",
  },
  {
    code: "CMS-ROUTE-500",
    severity: "error",
    title: "CMS route returned a server error",
    meaning:
      "The mapped page crashed or returned a 5xx response when cms-lab probed it.",
    fix: "Open the path locally or in staging, inspect the server logs, and fix the page data fetching or rendering error.",
  },
  {
    code: "CMS-ROUTE-ERROR",
    severity: "error",
    title: "CMS route probe failed",
    meaning:
      "cms-lab could not complete the HTTP probe for a mapped CMS route, or the route returned an unexpected 4xx response.",
    fix: "Verify the site is reachable, the route is public, auth middleware allows the probe, and the URL mapping is correct.",
  },
  {
    code: "CMS-ROUTE-INVALID",
    severity: "error",
    title: "Route mapping returned an invalid path",
    meaning:
      "A route getPath function returned an empty value, a value that does not start with /, or a protocol-relative path that could leave the configured site origin.",
    fix: "Update the getPath function to return a same-origin site path such as /about or /blog/my-post.",
  },
  {
    code: "CMS-ROUTE-UNMAPPED",
    severity: "info",
    title: "CMS document has no route mapping",
    meaning:
      "A fetched CMS document type is not listed in the cms-lab routes config, so cms-lab skipped route probing for that document.",
    fix: "Add a route mapping if this content type should render a public page, or leave it unmapped for settings/navigation documents.",
  },
  {
    code: "CMS-ROUTE-RESOLVE",
    severity: "error",
    title: "Route mapping threw an exception",
    meaning: "A route getPath function failed while resolving a CMS document.",
    fix: "Make the getPath function tolerate optional fields and return a clear absolute path for every routable document.",
  },
  {
    code: "SEO-META-MISSING",
    severity: "warning",
    title: "SEO metadata is missing",
    meaning:
      "A document is missing one or more configured SEO fields. cms-lab checks common provider fields such as Prismic meta fields, Strapi/Directus seo objects, and WordPress SEO plugin JSON.",
    fix: "Fill the missing CMS fields or disable the SEO check if this content type intentionally does not use metadata.",
  },
  {
    code: "A11Y-IMG-ALT",
    severity: "warning",
    title: "Image alt text is missing",
    meaning:
      "An image-like CMS field has no useful alt text, or uses a placeholder such as image, photo, or picture. Native fields such as Prismic alt, Strapi alternativeText, Directus file description, and WordPress alt_text are checked.",
    fix: "Add meaningful alt text in the CMS, or leave decorative images out of content fields that require editorial alt text.",
  },
  {
    code: "CMS-FIELD-MISSING",
    severity: "error",
    title: "Required CMS field is missing",
    meaning:
      "A document is missing a required field declared in cms-lab config.",
    fix: "Fill the required field in the CMS, or update checks.fields.required if the field is no longer required.",
  },
];

export function explainDiagnostic(
  code: string,
): DiagnosticExplanation | undefined {
  return explanations.find(
    (explanation) => explanation.code === code.trim().toUpperCase(),
  );
}

export function listDiagnosticExplanations(): DiagnosticExplanation[] {
  return [...explanations];
}
