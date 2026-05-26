import type { Metadata } from "next";
import Link from "next/link";

import { CodeBlock, DocsShell } from "../../components";

export const metadata: Metadata = {
  title: "Backend-only CMS workflow",
  description:
    "Use cms-lab agent context and config planning before a frontend exists.",
};

export default function BackendOnlyPage() {
  return (
    <DocsShell
      active="/docs/backend-only"
      toc={[
        { href: "#fit", label: "When it fits" },
        { href: "#config", label: "Config" },
        { href: "#agent-context", label: "Agent context" },
        { href: "#limits", label: "Limits" },
        { href: "#frontend", label: "Add frontend" },
      ]}
    >
      <div className="breadcrumb">Docs / Backend-only</div>
      <h1>Backend-only CMS workflow</h1>
      <p className="lede">
        cms-lab can help before a frontend exists, but the workflow is
        different. Use it to document CMS collections, expected routes, and
        required fields first; run route scans after a frontend is available.
      </p>

      <h2 id="fit">When it fits</h2>
      <p>
        This is useful for Directus, Strapi, or other backend-heavy projects
        where the CMS schema exists before the public Next.js app. You can keep
        route assumptions, collection names, field paths, and agent handoff
        instructions in one place without exposing tokens or private URLs.
      </p>
      <div className="callout">
        <strong>Route scans still need an app</strong>
        <code>cms-lab scan</code> checks real URLs. It needs a running frontend
        or staging site. Backend-only mode is for config, docs, and AI-agent
        context until that frontend exists.
      </div>

      <h2 id="config">Start with config</h2>
      <p>
        Create a config that describes the CMS shape using generic local URLs
        and environment variables for secrets. Route mappings can be planned now
        and adjusted later when the frontend route files exist.
      </p>
      <CodeBlock>{`import { defineConfig } from "@cms-lab/core";

export default defineConfig({
  site: { url: "http://localhost:3000" },
  framework: { type: "next", router: "app" },
  cms: {
    provider: "directus",
    url: "http://localhost:8055",
    token: process.env.DIRECTUS_TOKEN,
    collections: [
      { type: "branch", collection: "branches", uidField: "slug" },
      { type: "menu_item", collection: "menu_items", uidField: "slug" },
      { type: "category", collection: "menu_categories", uidField: "slug" },
    ],
  },
  routes: [
    { type: "branch", pattern: "/branches/:slug", getPath: (doc) => "/branches/" + doc.uid },
    { type: "menu_item", pattern: "/menu/:slug", getPath: (doc) => "/menu/" + doc.uid },
  ],
  checks: {
    fields: {
      required: [
        { type: "branch", path: "name" },
        { type: "menu_item", path: "base_price", severity: "warning" },
      ],
    },
  },
});`}</CodeBlock>

      <h2 id="agent-context">Generate agent context</h2>
      <p>
        Use CMS-only mode when the repo does not contain a Next.js app yet. The
        generated files state that no frontend was detected and tell coding
        agents not to run route scans too early.
      </p>
      <CodeBlock>{`npx @cms-lab/cli agent-context --mode cms-only --preset all`}</CodeBlock>
      <p>
        This writes safe markdown files such as <code>AGENTS.md</code>,{" "}
        <code>.cms-lab/agent-context.md</code>, and{" "}
        <code>.cms-lab/agent-prompt.md</code>. Existing files are not
        overwritten unless <code>--force</code> is passed.
      </p>

      <h2 id="limits">Current limits</h2>
      <p>
        Backend-only mode does not fetch every schema detail from the CMS and it
        does not prove that URLs render. Relationship and business-rule checks,
        such as “every active menu item has branch pricing,” are separate
        product work from basic route, field, SEO, and image checks.
      </p>
      <p>
        Keep secrets in environment variables. Do not commit CMS tokens, webhook
        URLs, raw CMS payload dumps, private site URLs, or generated reports
        that include sensitive project data.
      </p>

      <h2 id="frontend">Add the frontend later</h2>
      <p>
        Once a Next.js app exists, run <code>doctor</code> to verify the config,
        detected router, CMS connection, and site health. Then run a focused
        first scan before adding CI gates.
      </p>
      <CodeBlock>{`npx @cms-lab/cli doctor
npx @cms-lab/cli scan --ci --report --fail-on never`}</CodeBlock>
      <p>
        Next steps: <Link href="/docs/configuration">finish the config</Link>,{" "}
        <Link href="/docs/agent-context">tune agent context</Link>, and{" "}
        <Link href="/docs/scan">run the scan command</Link>.
      </p>
    </DocsShell>
  );
}
