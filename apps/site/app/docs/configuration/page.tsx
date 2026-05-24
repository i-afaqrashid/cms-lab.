import type { Metadata } from "next";
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
    { type: "article", pattern: "/articles/:uid", getPath: (doc) => "/articles/" + doc.uid },
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
            <td>Prismic, Strapi, Directus, and WordPress provider settings.</td>
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
        Adapter configs use the same route and check model. Strapi and Directus
        declare collections; WordPress declares REST content types. The adapters
        preserve native CMS fields in <code>document.data</code>, so route
        mappings and required-field checks can use provider-specific values when
        your app needs them.
      </p>
      <CodeBlock>{`cms: {
  provider: "strapi",
  url: "http://localhost:1337",
  token: process.env.STRAPI_TOKEN,
  collections: [{ type: "page", endpoint: "pages" }],
}

cms: {
  provider: "directus",
  url: "http://localhost:8055",
  token: process.env.DIRECTUS_TOKEN,
  collections: [{ type: "page", collection: "pages" }],
}

cms: {
  provider: "wordpress",
  url: "http://localhost:8080",
  contentTypes: [{ type: "post", endpoint: "posts" }],
}`}</CodeBlock>

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
        <code>alternativeText</code>, Directus image descriptions, and WordPress{" "}
        <code>alt_text</code>.
      </div>
    </DocsShell>
  );
}
