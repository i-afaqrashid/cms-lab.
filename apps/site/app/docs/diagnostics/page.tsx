import type { Metadata } from "next";
import { DiagnosticCode, DocsShell } from "../../components";

export const metadata: Metadata = {
  title: "Diagnostics",
  description: "cms-lab diagnostic code reference.",
};

export default function DiagnosticsPage() {
  return (
    <DocsShell
      active="/docs/diagnostics"
      toc={[
        { href: "#codes", label: "Codes" },
        { href: "#explain", label: "Explain" },
      ]}
    >
      <div className="breadcrumb">Docs / Diagnostics</div>
      <h1>Diagnostics</h1>
      <p className="lede">
        Every finding has a stable code, severity, message, optional route path,
        and source document. Use the code in docs, filters, and CI scripts.
      </p>

      <h2 id="codes">Codes</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Severity</th>
            <th>Group</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <DiagnosticCode code="CMS-ROUTE-404" severity="error" group="routes">
            Expected route returned 404.
          </DiagnosticCode>
          <DiagnosticCode code="CMS-ROUTE-500" severity="error" group="routes">
            Expected route returned a 5xx response.
          </DiagnosticCode>
          <DiagnosticCode
            code="CMS-ROUTE-DUPLICATE"
            severity="error"
            group="routes"
          >
            Two or more published documents resolve to the same route path. Only
            one wins at runtime; drafts are ignored.
          </DiagnosticCode>
          <DiagnosticCode
            code="CMS-ROUTE-ERROR"
            severity="error"
            group="routes"
          >
            Route probe failed or returned another 4xx response.
          </DiagnosticCode>
          <DiagnosticCode
            code="CMS-ROUTE-INVALID"
            severity="error"
            group="routes"
          >
            Config route resolved to an empty, non-slash, or protocol-relative
            path.
          </DiagnosticCode>
          <DiagnosticCode
            code="CMS-ROUTE-RESOLVE"
            severity="error"
            group="routes"
          >
            The configured <code>getPath</code> function threw.
          </DiagnosticCode>
          <DiagnosticCode
            code="CMS-UID-MISSING"
            severity="error"
            group="routes"
          >
            A route pattern needs <code>:uid</code>, but the document has no
            UID.
          </DiagnosticCode>
          <DiagnosticCode
            code="CMS-ROUTE-UNMAPPED"
            severity="info"
            group="routes"
          >
            Document type has no configured route mapping.
          </DiagnosticCode>
          <DiagnosticCode
            code="CMS-FIELD-MISSING"
            severity="mixed"
            group="fields"
          >
            A project-specific required field is missing or blank. Severity
            follows that field rule.
          </DiagnosticCode>
          <DiagnosticCode
            code="CMS-RELATIONSHIP-MISSING"
            severity="mixed"
            group="relationships"
          >
            A configured relationship rule found fewer matching related records
            than expected. Severity follows that relationship rule.
          </DiagnosticCode>
          <DiagnosticCode
            code="CMS-RELATIONSHIP-UNPUBLISHED"
            severity="warning"
            group="relationships"
          >
            A published document&apos;s relationship is satisfied only by draft
            records, so it links to nothing live at runtime.
          </DiagnosticCode>
          <DiagnosticCode
            code="CMS-LOCALE-MISSING"
            severity="warning"
            group="localization"
          >
            A content group has no published document in one or more configured
            locales. Opt-in via <code>checks.localization</code>.
          </DiagnosticCode>
          <DiagnosticCode
            code="SEO-META-MISSING"
            severity="warning"
            group="seo"
          >
            SEO title or description is blank across the provider-specific field
            shapes cms-lab understands.
          </DiagnosticCode>
          <DiagnosticCode
            code="SEO-CANONICAL-MISSING"
            severity="warning"
            group="seo"
          >
            A 2xx route has no <code>{`<link rel="canonical">`}</code>. Opt-in
            via <code>checks.routes.canonical</code>.
          </DiagnosticCode>
          <DiagnosticCode
            code="SEO-CANONICAL-OFF-ORIGIN"
            severity="error"
            group="seo"
          >
            Canonical points to a different origin, often a leftover staging
            hostname.
          </DiagnosticCode>
          <DiagnosticCode
            code="SEO-CANONICAL-MISMATCH"
            severity="warning"
            group="seo"
          >
            Canonical path disagrees with the probed path beyond trailing slash
            and case.
          </DiagnosticCode>
          <DiagnosticCode
            code="SEO-JSONLD-INVALID"
            severity="warning"
            group="seo"
          >
            A route has a malformed <code>application/ld+json</code> block.
            Opt-in via <code>checks.routes.structuredData</code>.
          </DiagnosticCode>
          <DiagnosticCode code="SEO-JSONLD-MISSING" severity="info" group="seo">
            A route renders no JSON-LD structured data. Informational; enabled
            via <code>checks.routes.structuredData</code>.
          </DiagnosticCode>
          <DiagnosticCode
            code="SEO-OG-IMAGE-MISSING"
            severity="warning"
            group="seo"
          >
            Open Graph image is missing. Opt-in via <code>checks.seo.og</code>.
          </DiagnosticCode>
          <DiagnosticCode code="SEO-OG-MISSING" severity="warning" group="seo">
            Open Graph title or description is missing. Enabled via the{" "}
            <code>checks.seo.og</code> object form.
          </DiagnosticCode>
          <DiagnosticCode
            code="SEO-TWITTER-MISSING"
            severity="info"
            group="seo"
          >
            X (Twitter) card image is missing. Enabled via the{" "}
            <code>checks.seo.og</code> object form; X falls back to the Open
            Graph image.
          </DiagnosticCode>
          <DiagnosticCode code="A11Y-IMG-ALT" severity="warning" group="a11y">
            A CMS image field is missing useful alt text in the provider native
            alt field.
          </DiagnosticCode>
          <DiagnosticCode
            code="CMS-IMG-DIMENSIONS"
            severity="warning"
            group="images"
          >
            A CMS image field exposes no width/height, a common cause of layout
            shift (CLS). Opt-in via <code>checks.images.dimensions</code>.
          </DiagnosticCode>
          <DiagnosticCode code="CUSTOM-RULE" severity="mixed" group="custom">
            A project-specific rule declared in <code>checks.custom</code> did
            not hold. Default code for declarative rules; functional rules may
            emit their own codes. Severity follows that rule.
          </DiagnosticCode>
        </tbody>
      </table>

      <h2 id="explain">Explain a code</h2>
      <p>Use the CLI when you want the short fix guidance in your terminal.</p>
      <pre className="codeblock">npx @cms-lab/cli explain CMS-ROUTE-404</pre>
    </DocsShell>
  );
}
