import type { Metadata } from "next";
import { DocsShell } from "../../components";

export const metadata: Metadata = {
  title: "Tested With",
  description: "cms-lab compatibility matrix with explicit test coverage.",
};

const rows = [
  {
    adapter: "Prismic",
    packageName: "@cms-lab/prismic",
    configDocs: "yes",
    tests: "fixture + public smoke",
    publicExample: "yes",
    singletons: "not provider-specific",
    relations: "route functions only",
    limits:
      "The strongest path today. Preview refs, migration APIs, and schema drift are not covered yet.",
  },
  {
    adapter: "Strapi",
    packageName: "@cms-lab/strapi",
    configDocs: "yes",
    tests: "fixture + local smoke",
    publicExample: "planned",
    singletons: "single types supported",
    relations: "slug helper",
    limits:
      "Strapi v4 shapes, locales, single types, and relation slugs are covered. Deep business rules are still planned.",
  },
  {
    adapter: "Directus",
    packageName: "@cms-lab/directus",
    configDocs: "basic",
    tests: "adapter fixtures",
    publicExample: "not yet",
    singletons: "not yet",
    relations: "not yet",
    limits:
      "Basic collection fetching and normalization are covered. CMS-only workflows and relation checks need more work.",
  },
  {
    adapter: "WordPress",
    packageName: "@cms-lab/wordpress",
    configDocs: "basic",
    tests: "adapter fixtures",
    publicExample: "not yet",
    singletons: "custom endpoints only",
    relations: "not yet",
    limits:
      "Pages, posts, custom endpoints, statuses, Yoast-style SEO, and media fields are covered at fixture level.",
  },
  {
    adapter: "Contentful",
    packageName: "@cms-lab/contentful",
    configDocs: "basic",
    tests: "adapter fixtures",
    publicExample: "not yet",
    singletons: "not yet",
    relations: "not yet",
    limits:
      "Entry fetch, pagination, default-locale flattening, UID fields, SEO, and image records are covered at fixture level.",
  },
  {
    adapter: "Sanity",
    packageName: "@cms-lab/sanity",
    configDocs: "basic",
    tests: "adapter fixtures",
    publicExample: "not yet",
    singletons: "document types only",
    relations: "not yet",
    limits:
      "Document fetch, GROQ response normalization, slug fields, SEO, images, and draft IDs are covered at fixture level.",
  },
  {
    adapter: "Payload",
    packageName: "not available",
    configDocs: "not yet",
    tests: "not yet",
    publicExample: "not yet",
    singletons: "not yet",
    relations: "not yet",
    limits: "Tracked separately before claiming Payload support.",
  },
];

export default function TestedWithPage() {
  return (
    <DocsShell
      active="/docs/tested-with"
      toc={[
        { href: "#matrix", label: "Matrix" },
        { href: "#criteria", label: "Criteria" },
        { href: "#limits", label: "Limits" },
      ]}
    >
      <div className="breadcrumb">Docs / Tested with</div>
      <h1>Tested with</h1>
      <p className="lede">
        This matrix says what is actually covered today and where each adapter
        is still thin. It is not a customer list, certification program, or
        broad compatibility claim.
      </p>

      <h2 id="matrix">Adapter maturity matrix</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Adapter</th>
            <th>Config docs</th>
            <th>Test coverage</th>
            <th>Public example</th>
            <th>Singletons/globals</th>
            <th>Relations</th>
            <th>Known limits</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.adapter}>
              <td>
                <strong>{row.adapter}</strong>
                <br />
                <code>{row.packageName}</code>
              </td>
              <td>{row.configDocs}</td>
              <td>{row.tests}</td>
              <td>{row.publicExample}</td>
              <td>{row.singletons}</td>
              <td>{row.relations}</td>
              <td>{row.limits}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 id="criteria">How to read it</h2>
      <p>
        “Config docs” means the provider has a working config example in the
        public docs or README. “Test coverage” means the adapter path is backed
        by fixture tests, a public demo, or a repeatable smoke test. “Public
        example” means someone can run the adapter path without private
        credentials.
      </p>
      <p>
        Relation support is intentionally narrow unless cms-lab has provider
        helpers or tests for that relationship shape. Project-specific business
        rules, such as “every active item must have branch pricing,” are tracked
        separately from route reachability.
      </p>

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
