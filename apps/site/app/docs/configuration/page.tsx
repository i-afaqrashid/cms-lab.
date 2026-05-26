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
        <strong>Provider fields</strong>
        SEO and image checks understand the common native shapes from the
        bundled adapters, including Strapi <code>seo.metaTitle</code>, Directus{" "}
        <code>seo.title</code>, WordPress <code>yoast_head_json</code>, Strapi{" "}
        <code>alternativeText</code>, Directus image descriptions, WordPress{" "}
        <code>alt_text</code>, Contentful asset descriptions, and Sanity image{" "}
        <code>alt</code> fields.
      </div>
    </DocsShell>
  );
}
