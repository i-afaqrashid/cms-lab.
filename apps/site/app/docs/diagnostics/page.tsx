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
            code="SEO-META-MISSING"
            severity="warning"
            group="seo"
          >
            SEO title or description is blank across the provider-specific field
            shapes cms-lab understands.
          </DiagnosticCode>
          <DiagnosticCode code="A11Y-IMG-ALT" severity="warning" group="a11y">
            A CMS image field is missing useful alt text in the provider native
            alt field.
          </DiagnosticCode>
        </tbody>
      </table>

      <h2 id="explain">Explain a code</h2>
      <p>Use the CLI when you want the short fix guidance in your terminal.</p>
      <pre className="codeblock">npx cms-lab explain CMS-ROUTE-404</pre>
    </DocsShell>
  );
}
