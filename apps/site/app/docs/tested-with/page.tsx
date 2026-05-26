import type { Metadata } from "next";
import { DocsShell } from "../../components";

export const metadata: Metadata = {
  title: "Tested With",
  description: "cms-lab compatibility matrix with explicit test coverage.",
};

const rows = [
  {
    stack: "Prismic + Next.js App Router",
    coverage: "Public fixture and packaged CLI smoke",
    notes: "Route, field, terminal, report, and CI paths are exercised.",
  },
  {
    stack: "Strapi v4 + Next.js Pages Router",
    coverage: "Repeatable smoke plus adapter tests",
    notes:
      "Collections, nested fields, Pages Router detection, and report output are covered.",
  },
  {
    stack: "Strapi single types",
    coverage: "Adapter tests and repeatable smoke",
    notes:
      "Single types are checked for content diagnostics without route-unmapped noise.",
  },
  {
    stack: "Contentful adapter",
    coverage: "Adapter fixture tests",
    notes:
      "Basic fetch, normalization, custom UID fields, SEO fields, and image records are covered.",
  },
  {
    stack: "Sanity adapter",
    coverage: "Adapter fixture tests",
    notes:
      "Basic document fetch, GROQ response normalization, slug fields, SEO, and images are covered.",
  },
  {
    stack: "WordPress adapter",
    coverage: "Adapter fixture tests",
    notes:
      "Pages/posts, custom endpoints, statuses, Yoast-style SEO, and media alt fields are covered.",
  },
  {
    stack: "Directus adapter",
    coverage: "Adapter fixture tests",
    notes:
      "Collections, custom UID fields, statuses, SEO, and file description alt text are covered.",
  },
];

export default function TestedWithPage() {
  return (
    <DocsShell
      active="/docs/tested-with"
      toc={[
        { href: "#matrix", label: "Matrix" },
        { href: "#limits", label: "Limits" },
      ]}
    >
      <div className="breadcrumb">Docs / Tested with</div>
      <h1>Tested with</h1>
      <p className="lede">
        This matrix says what is actually covered today. It is not a customer
        list, certification program, or broad compatibility claim.
      </p>

      <h2 id="matrix">Matrix</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Stack</th>
            <th>Coverage</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.stack}>
              <td>{row.stack}</td>
              <td>{row.coverage}</td>
              <td>{row.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 id="limits">What this does not mean</h2>
      <p>
        CMS projects differ heavily by schema, route mapping, locale strategy,
        preview mode, and auth. Passing this matrix means cms-lab has real test
        coverage for the adapter path, not that every project using that CMS is
        automatically covered.
      </p>
      <div className="callout">
        <strong>No fake claims</strong>
        The matrix should only grow when a fixture, adapter test, public demo,
        or repeatable smoke test exists.
      </div>
    </DocsShell>
  );
}
