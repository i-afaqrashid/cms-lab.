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
    code: "CMS-ROUTE-DUPLICATE",
    severity: "error",
    title: "Two documents resolve to the same route",
    meaning:
      "More than one published CMS document maps to the same site path. Only one wins at runtime, so the others are unreachable content debt. Editors can update the wrong one and lose changes. Draft documents are ignored.",
    fix: "Give each document a unique slug or route, unpublish the duplicate, or change the route mapping so locale or content type keeps the paths distinct.",
  },
  {
    code: "CMS-ROUTE-SOFT-404",
    severity: "warning",
    title: "CMS route returned a soft-404 body",
    meaning:
      "The route returned a 2xx response, but the body matched a configured not-found marker (string or <title> pattern). The framework or theme is rendering a fallback for missing content even though the status code says success.",
    fix: "Fix the missing data path so the route returns a real 404, or remove this content from the CMS so it stops resolving to a route. Tune checks.routes.soft404 if the detection is too eager.",
  },
  {
    code: "SEO-META-MISSING",
    severity: "warning",
    title: "SEO metadata is missing",
    meaning:
      "A document is missing one or more configured SEO fields. cms-lab checks common provider fields such as Prismic meta fields, Strapi/Directus seo objects, WordPress SEO plugin JSON, and Contentful/Sanity SEO fields.",
    fix: "Fill the missing CMS fields or disable the SEO check if this content type intentionally does not use metadata.",
  },
  {
    code: "SEO-OG-IMAGE-MISSING",
    severity: "warning",
    title: "Open Graph image is missing",
    meaning:
      "Open Graph validation is enabled (checks.seo.og) and a document has no og:image in the known CMS field paths. Shares of this page on social and chat apps fall back to a blank or generic preview.",
    fix: "Add an OG image field in the CMS, or disable checks.seo.og if your app generates social cards at runtime (generateMetadata / next/og).",
  },
  {
    code: "SEO-OG-MISSING",
    severity: "warning",
    title: "Open Graph title or description is missing",
    meaning:
      "Open Graph title/description validation is enabled and a document is missing og:title or og:description in the known CMS field paths.",
    fix: "Fill the Open Graph fields in the CMS, or narrow checks.seo.og so only the fields you author are required.",
  },
  {
    code: "SEO-TWITTER-MISSING",
    severity: "info",
    title: "X (Twitter) card image is missing",
    meaning:
      "X (Twitter) card validation is enabled and a document has no twitter:image in the known CMS field paths. X falls back to the Open Graph image when one exists, so this is informational.",
    fix: "Add an X (Twitter) card image field, or rely on the Open Graph image as the shared fallback.",
  },
  {
    code: "A11Y-IMG-ALT",
    severity: "warning",
    title: "Image alt text is missing",
    meaning:
      "An image-like CMS field has no useful alt text, or uses a placeholder such as image, photo, or picture. Native fields such as Prismic alt, Strapi alternativeText, Directus file description, WordPress alt_text, Contentful asset descriptions, and Sanity image alt fields are checked.",
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
  {
    code: "CMS-RELATIONSHIP-MISSING",
    severity: "warning",
    title: "CMS relationship rule did not match enough records",
    meaning:
      "A relationship rule expected a document to have one or more matching related records, but cms-lab found fewer than the configured minimum.",
    fix: "Check the related CMS collection, the join fields in checks.relationships, and whether the related content should be published or active.",
  },
  {
    code: "CUSTOM-RULE",
    severity: "error",
    title: "Custom rule failed",
    meaning:
      "A project-specific rule declared in checks.custom did not hold for a document. This is the default code for declarative custom rules; functional rules may emit their own codes.",
    fix: "Fix the CMS content so it satisfies the rule, or adjust the rule in checks.custom (path, assert, filter, or severity).",
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
