import type { Metadata } from "next";
import Link from "next/link";

import { CodeBlock, DocsShell } from "../../components";

export const metadata: Metadata = {
  title: "Configuration",
  description: "cms-lab config reference for Next.js routers and CMS adapters.",
};

export default function ConfigurationPage() {
  return (
    <DocsShell
      active="/docs/configuration"
      toc={[
        { href: "#example", label: "Example" },
        { href: "#keys", label: "Keys" },
        { href: "#adapter-examples", label: "Adapter examples" },
        { href: "#strapi-pages", label: "Strapi Pages Router" },
        { href: "#route-fields", label: "Route fields" },
        { href: "#required-fields", label: "Required fields" },
        { href: "#relationships", label: "Relationships" },
        { href: "#custom-rules", label: "Custom rules" },
      ]}
    >
      <div className="breadcrumb">Docs / Configuration</div>
      <h1>Configuration</h1>
      <p className="lede">
        cms-lab is deliberately config-first. Route mappings live in your repo
        so the scanner follows the same assumptions as your Next.js app.
      </p>

      <h2 id="example">Example</h2>
      <CodeBlock>{`import { defineConfig } from "@cms-lab/core";

export default defineConfig({
  site: { url: "http://localhost:3000" },
  framework: { type: "next", router: "app" },
  cms: {
    provider: "prismic",
    repositoryName: "my-repo",
    accessToken: process.env.PRISMIC_ACCESS_TOKEN,
  },
  routes: [
    { type: "page", pattern: "/:uid", getPath: (doc) => "/" + doc.uid },
    {
      type: "article",
      pattern: "/articles/:uid",
      getPath: (doc) => "/articles/" + doc.uid,
    },
  ],
  checks: {
    fields: {
      required: [
        { type: "page", path: "title" },
        { type: "article", path: "title", severity: "warning" },
      ],
    },
    relationships: [
      {
        from: "article",
        to: "author",
        where: { fromField: "author.id", toField: "id" },
        min: 1,
        severity: "warning",
      },
    ],
  },
});`}</CodeBlock>

      <h2 id="keys">Keys</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Key</th>
            <th>Required</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>site.url</code>
            </td>
            <td>yes</td>
            <td>The local, preview, or staging URL that route probes hit.</td>
          </tr>
          <tr>
            <td>
              <code>site.healthPath</code>
            </td>
            <td>no</td>
            <td>
              Same-origin path used only by <code>doctor</code> and the initial
              scan health probe. Use it for localized apps where <code>/</code>{" "}
              redirects or returns a non-OK response but <code>/en</code> is
              healthy.
            </td>
          </tr>
          <tr>
            <td>
              <code>site.healthUrl</code>
            </td>
            <td>no</td>
            <td>
              Absolute URL for a dedicated health check endpoint. Route probes
              still use <code>site.url</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>framework</code>
            </td>
            <td>yes</td>
            <td>
              Use <code>{`{ type: "next", router: "app" }`}</code> or{" "}
              <code>{`{ type: "next", router: "pages" }`}</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>cms</code>
            </td>
            <td>yes</td>
            <td>
              Prismic, Strapi, Directus, WordPress, Contentful, and Sanity
              provider settings.
            </td>
          </tr>
          <tr>
            <td>
              <code>routes</code>
            </td>
            <td>yes</td>
            <td>
              Content type to path mapping. Use <code>getPath</code> when a
              route is not a simple UID pattern.
            </td>
          </tr>
          <tr>
            <td>
              <code>checks</code>
            </td>
            <td>no</td>
            <td>Enable, disable, or configure check groups.</td>
          </tr>
        </tbody>
      </table>

      <h2 id="adapter-examples">Adapter examples</h2>
      <p>
        Adapter configs use the same route and check model. Strapi declares
        collections and single types; Directus declares collections; WordPress,
        Contentful, and Sanity declare content or document types. The adapters
        preserve native CMS fields in <code>document.data</code>, so route
        mappings and required-field checks can use provider-specific values when
        your app needs them.
      </p>
      <p>
        For provider-specific setup notes and caveats, open{" "}
        <Link href="/docs/providers">the provider docs</Link>.
      </p>
      <CodeBlock>{`cms: {
  provider: "strapi",
  url: "http://localhost:1337",
  token: process.env.STRAPI_TOKEN,
  locale: "en",
  collections: [
    {
      type: "page",
      endpoint: "pages",
      uidField: "routing.slug",
    },
  ],
  singleTypes: [
    {
      type: "navbar",
      endpoint: "navbar",
    },
  ],
}

cms: {
  provider: "directus",
  url: "http://localhost:8055",
  token: process.env.DIRECTUS_TOKEN,
  collections: [
    {
      type: "page",
      collection: "pages",
      uidField: "routing.slug",
    },
    {
      type: "pricing",
      collection: "item_branch_pricing",
      uidField: "id",
      routable: false,
    },
  ],
}

cms: {
  provider: "wordpress",
  url: "http://localhost:8080",
  contentTypes: [
    {
      type: "post",
      endpoint: "posts",
      uidField: "acf.handle",
    },
  ],
}

cms: {
  provider: "contentful",
  spaceId: "my-space",
  accessToken: process.env.CONTENTFUL_DELIVERY_TOKEN,
  contentTypes: [
    {
      type: "page",
      contentType: "page",
      uidField: "routing.slug",
    },
  ],
}

cms: {
  provider: "sanity",
  projectId: "my-project",
  dataset: "production",
  contentTypes: [
    {
      type: "page",
      documentType: "page",
      uidField: "slug.current",
    },
  ],
}`}</CodeBlock>

      <h2 id="strapi-pages">Strapi with Next.js Pages Router</h2>
      <p>
        Pages Router projects usually have explicit dynamic routes, so keep the
        Strapi mapping equally explicit. Single types are scanned for fields,
        SEO, and images, but they are not treated as missing page routes by
        default.
      </p>
      <CodeBlock>{`import { defineConfig, strapiRelationSlug } from "@cms-lab/core";

export default defineConfig({
  site: {
    url: "http://localhost:3000",
    healthPath: "/en",
  },
  framework: { type: "next", router: "pages" },
  cms: {
    provider: "strapi",
    url: "http://localhost:1337",
    token: process.env.STRAPI_TOKEN,
    locale: "en",
    collections: [
      { type: "page", endpoint: "pages", uidField: "slug" },
      { type: "article", endpoint: "articles", uidField: "slug" },
    ],
    singleTypes: [
      { type: "navbar", endpoint: "navbar" },
      { type: "footer", endpoint: "footer" },
    ],
  },
  routes: [
    { type: "page", pattern: "/:slug", getPath: (doc) => "/" + doc.uid },
    {
      type: "article",
      pattern: "/blog/:topic/:slug",
      getPath: (doc) => {
        const topic = strapiRelationSlug(doc.data, "topic") ?? "uncategorized";
        return "/blog/" + topic + "/" + doc.uid;
      },
    },
  ],
});`}</CodeBlock>

      <h2 id="route-fields">Route fields</h2>
      <p>
        Strapi, Directus, WordPress, Contentful, and Sanity entries can define{" "}
        <code>uidField</code> and <code>urlField</code> on each configured
        collection or content type. Use them when the route value lives in a
        project-specific field instead of a plain <code>uid</code> or{" "}
        <code>slug</code>.
      </p>
      <CodeBlock>{`cms: {
  provider: "sanity",
  projectId: "my-project",
  dataset: "production",
  contentTypes: [
    {
      type: "article",
      documentType: "post",
      uidField: "slug.current",
      urlField: "seo.canonical",
    },
  ],
}`}</CodeBlock>
      <div className="callout">
        <strong>Path format</strong>
        Adapter field mappings are read from <code>document.data</code>. Use
        dotted paths for nested objects, for example <code>routing.slug</code>{" "}
        or <code>seo.canonical</code>.
      </div>

      <h2 id="required-fields">Required fields</h2>
      <p>
        Field checks are project-specific. Use them for CMS values that your app
        assumes exist at render time.
      </p>
      <CodeBlock>{`checks: {
  seo: {
    metaTitle: true,
    metaDescription: true,
    // Open Graph / X (Twitter) cards are opt-in. "true" checks og:image.
    og: true,
    // Or enable more: { image: true, title: true, description: true, twitter: true }
  },
  a11y: {
    imgAlt: true,
  },
  fields: {
    required: [
      { type: "page", path: "title" },
      { type: "article", path: "author.name", severity: "warning" },
    ],
  },
}`}</CodeBlock>
      <div className="callout">
        <strong>Path format</strong>
        Required field paths are read from <code>document.data</code>. Use
        dotted paths for nested objects, for example <code>author.name</code>.
      </div>
      <div className="callout">
        <strong>Social cards are opt-in</strong>
        <code>checks.seo.og</code> validates Open Graph and X (Twitter) card
        fields at the CMS level. It is off by default because many Next.js apps
        generate social cards at runtime with <code>generateMetadata</code> or{" "}
        <code>next/og</code> rather than storing them in the CMS. Enable it only
        when editors author those fields.
      </div>
      <div className="callout">
        <strong>Canonical validation is opt-in</strong>
        <code>{`checks: { routes: { canonical: true } }`}</code> reads each 2xx
        route body and checks its <code>{`<link rel="canonical">`}</code>: a
        missing canonical is a warning, a canonical on a different origin (a
        leftover staging hostname) is an error, and a canonical whose path
        disagrees with the route is a warning. It is off by default because it
        requires reading response bodies.
      </div>
      <h2 id="relationships">Relationships</h2>
      <p>
        Relationship checks compare one field on a source document with one
        field on related documents. Use them for simple junction-table rules,
        such as a catalog item needing at least one pricing row.
      </p>
      <CodeBlock>{`checks: {
  relationships: [
    {
      from: "menu_item",
      to: "pricing",
      where: { fromField: "id", toField: "menu_item_id" },
      min: 1,
      severity: "warning",
    },
  ],
}`}</CodeBlock>
      <div className="callout">
        <strong>First version</strong>
        Relationship rules currently use equality joins against normalized CMS
        documents. More specific active-status and price rules should stay in
        required fields or project checks until adapter-specific rules exist.
      </div>
      <div className="callout">
        <strong>Provider fields</strong>
        SEO and image checks understand the common native shapes from the
        bundled adapters, including Strapi <code>seo.metaTitle</code>, Directus{" "}
        <code>seo.title</code>, WordPress <code>yoast_head_json</code>, Strapi{" "}
        <code>alternativeText</code>, Directus image descriptions, WordPress{" "}
        <code>alt_text</code>, Contentful asset descriptions, and Sanity image{" "}
        <code>alt</code> fields.
      </div>

      <h2 id="custom-rules">Custom rules</h2>
      <p>
        Custom rules cover project-specific invariants that the built-in route,
        field, SEO, and image checks do not. They come in two forms: declarative
        rules for the common case and functional rules for the rest. Both
        produce normal diagnostics, so they show up in the terminal, JSON,
        Markdown, JUnit, Slack, and HTML reports, and they respect{" "}
        <code>--only custom</code> and <code>--skip custom</code>.
      </p>
      <p>
        A declarative rule applies to one content <code>type</code>, reads the
        value at <code>path</code> from <code>document.data</code>, and emits a
        diagnostic when <code>assert</code> fails. An optional{" "}
        <code>filter</code> narrows the rule to documents whose fields match.
      </p>
      <CodeBlock>{`checks: {
  custom: [
    // active menu items must have a price above zero
    {
      code: "MENU-PRICE",
      type: "menu_item",
      path: "price",
      assert: { gt: 0 },
      severity: "error",
      message: "Menu item price must be greater than 0",
    },
    // legal pages must have been reviewed in the last 12 months
    {
      type: "page",
      filter: { template: "legal" },
      path: "last_reviewed_at",
      assert: { newerThan: "12months" },
      severity: "warning",
      code: "LEGAL-REVIEW-OVERDUE",
    },
    // event dates must be in the future
    { type: "event", path: "eventDate", assert: "futureDate" },
    // image descriptions must not be placeholder text
    {
      type: "menu_item",
      path: "image.description",
      assert: { notMatches: "^(image|photo|picture)$" },
      code: "IMG-DESC-PLACEHOLDER",
    },
  ],
}`}</CodeBlock>
      <p>
        Supported assertions: <code>present</code>, <code>futureDate</code>,{" "}
        <code>pastDate</code> (string shorthands), and the object form with{" "}
        <code>gt</code>, <code>gte</code>, <code>lt</code>, <code>lte</code>,{" "}
        <code>oneOf</code>, <code>matches</code>, <code>notMatches</code>,{" "}
        <code>minLength</code>, <code>maxLength</code>, <code>newerThan</code>,
        and <code>olderThan</code>. Every constraint in an object assertion must
        hold for the rule to pass. Durations accept values such as{" "}
        <code>30d</code>, <code>2 weeks</code>, <code>12months</code>, or{" "}
        <code>1y</code>.
      </p>
      <p>
        A functional rule is a function called once per document. It receives
        the document and a context with <code>readPath</code> plus{" "}
        <code>error</code>, <code>warning</code>, and <code>info</code> helpers.
        Use it for cross-document or multi-field checks the declarative form
        cannot express.
      </p>
      <CodeBlock>{`checks: {
  custom: [
    (doc, ctx) => {
      if (doc.type !== "branch") return;
      const items = ctx.readPath("available_items");
      if (!Array.isArray(items) || items.length === 0) {
        ctx.error(
          "BRANCH-NO-ITEMS",
          "Branch " + doc.id + " has no available items",
          { path: "data.available_items" },
        );
      }
    },
  ],
}`}</CodeBlock>
      <div className="callout">
        <strong>Codes and grouping</strong>
        Declarative rules default to the <code>CUSTOM-RULE</code> code; set{" "}
        <code>code</code> to give a rule its own. Diagnostics whose code starts
        with <code>CUSTOM</code> are grouped under a <code>custom</code> group
        in the HTML report and JUnit output; functional rules can use any code
        you like.
      </div>
    </DocsShell>
  );
}
