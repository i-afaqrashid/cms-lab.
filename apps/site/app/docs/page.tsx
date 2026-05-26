import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock, DocsShell, Terminal } from "../components";
import { stackBlitzStarterUrl } from "../example-links";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "Install, configure, and run cms-lab against Next.js and headless CMS content.",
};

export default function DocsPage() {
  return (
    <DocsShell
      active="/docs"
      toc={[
        { href: "#paths", label: "Choose a path" },
        { href: "#how-it-works", label: "How it works" },
        { href: "#install", label: "Install" },
        { href: "#first-scan", label: "First scan" },
        { href: "#backend-only", label: "Backend-only" },
        { href: "#examples", label: "Examples" },
        { href: "#comparison", label: "Comparison" },
        { href: "#stability", label: "Stability" },
        { href: "#next", label: "Next" },
      ]}
    >
      <div className="breadcrumb">Docs / Overview</div>
      <h1>cms-lab documentation</h1>
      <p className="lede">
        cms-lab is a local CLI for checking the contract between headless CMS
        content and a Next.js site. It runs from your project, fetches CMS
        documents, probes expected routes, and produces terminal, JSON, or a
        local HTML report.
      </p>

      <h2 id="paths">Choose a path</h2>
      <div className="pathList">
        <div className="pathItem">
          <strong>I have a Next.js frontend and want to scan routes</strong>
          <p>
            Start your app, write the config, run <code>doctor</code>, then run
            the scan command.
          </p>
          <Link href="/docs/scan">Scan command</Link>
        </div>
        <div className="pathItem">
          <strong>I only have a CMS/backend right now</strong>
          <p>
            Generate agent context and document route assumptions before the
            frontend exists.
          </p>
          <Link href="/docs/backend-only">Backend-only workflow</Link>
        </div>
        <div className="pathItem">
          <strong>I use Directus, Strapi, or another relational CMS</strong>
          <p>
            Check adapter maturity first, then model route mappings and required
            fields explicitly.
          </p>
          <Link href="/docs/tested-with">Adapter maturity matrix</Link>
        </div>
        <div className="pathItem">
          <strong>I have thousands of CMS entries</strong>
          <p>
            Start with a baseline, narrow by content type, and tune route probe
            concurrency before making CI strict.
          </p>
          <Link href="/docs/large-catalogs">Large catalog scanning</Link>
        </div>
        <div className="pathItem">
          <strong>I want CI output</strong>
          <p>
            Run cms-lab after the app is serving and upload the local report as
            a private artifact.
          </p>
          <Link href="/docs/ci">CI setup</Link>
        </div>
        <div className="pathItem">
          <strong>I want AI/coding-agent context</strong>
          <p>
            Generate safe project context files for tools that need CMS and
            route information.
          </p>
          <Link href="/docs/agent-context">Agent context</Link>
        </div>
        <div className="pathItem">
          <strong>I need to understand a first scan</strong>
          <p>
            Read the diagnostic codes and compare the output with common CMS
            failure examples.
          </p>
          <Link href="/docs/diagnostics">Diagnostics</Link>
        </div>
        <div className="pathItem">
          <strong>Something failed before the scan ran</strong>
          <p>
            Check common setup errors such as missing config, unreachable CMS,
            or a site health route that points at the wrong page.
          </p>
          <Link href="/docs/troubleshooting">Troubleshooting</Link>
        </div>
      </div>

      <h2 id="how-it-works">How it works</h2>
      <p>
        The config declares your site URL, framework, CMS repository, route
        mappings, and optional required fields. The scanner loads CMS documents,
        resolves each expected path, checks the running site, then adds content
        diagnostics for SEO, images, UID, and required field gaps. Provider
        adapters keep the original CMS payload while normalizing stable IDs,
        UID-like slugs, status, and public URLs where the CMS exposes them.
      </p>
      <div className="callout">
        <strong>Scope</strong>
        cms-lab supports Next.js App Router and Pages Router with Prismic,
        Strapi, Directus, WordPress, Contentful, and Sanity adapters. Shopify,
        internal links, and schema drift checks stay out of the default scan
        until they have adapters, fixtures, and release smoke coverage.
      </div>

      <h2 id="install">Install</h2>
      <p>Run without installing:</p>
      <CodeBlock>{`npx @cms-lab/cli scan`}</CodeBlock>
      <p>Or pin it in a project:</p>
      <CodeBlock>{`pnpm add -D @cms-lab/cli @cms-lab/core`}</CodeBlock>

      <h2 id="first-scan">Your first scan</h2>
      <p>
        Start your Next app, create a config file, then run scan. Use{" "}
        <code>doctor</code> first when connecting a repo for the first time.
      </p>
      <Terminal title="first run">
        <span className="tMuted">$</span> npx @cms-lab/cli doctor{"\n"}
        <span className="tOk">config ok</span> - cms-lab.config.ts{"\n"}
        <span className="tOk">next app ok</span> - app{"\n"}
        <span className="tOk">site ok</span> - http://localhost:3000{"\n"}
        <span className="tOk">cms ok</span> - 6 documents{"\n\n"}
        <span className="tMuted">$</span> npx @cms-lab/cli scan --report
      </Terminal>

      <h2 id="backend-only">If you only have a CMS/backend</h2>
      <p>
        Start with config and agent context. Route scans wait until a frontend
        is running, but backend-only projects can still document collection
        shapes, route plans, and field assumptions for coding agents.
      </p>
      <p>
        <Link href="/docs/backend-only">Read the backend-only workflow</Link>
      </p>

      <h2 id="examples">Try a runnable example</h2>
      <p>
        If you want to see cms-lab before wiring it into your own CMS, open the
        broken Prismic demo in a browser workspace. It intentionally produces a
        report with real route, field, SEO, and image diagnostics.
      </p>
      <p>
        <a href={stackBlitzStarterUrl}>Run in StackBlitz</a>
      </p>

      <h2 id="comparison">How it fits with other tools</h2>
      <p>
        cms-lab does not replace Playwright, Lighthouse CI, accessibility tools,
        or link checkers. It covers the CMS-aware layer between content records
        and routes.
      </p>
      <p>
        <Link href="/docs/comparison">Read the comparison guide</Link>
      </p>

      <h2 id="stability">Project stability</h2>
      <p>
        cms-lab is early, so the docs separate stable CLI behavior from adapter
        maturity and planned checks. Review the versioning policy before using a
        scan as a deploy gate.
      </p>
      <p>
        <Link href="/docs/versioning">Read the versioning policy</Link>
      </p>

      <h2 id="next">Where to next</h2>
      <ul>
        <li>
          <Link href="/docs/configuration">Write the config</Link>
        </li>
        <li>
          <Link href="/docs/backend-only">
            Plan a backend-only CMS workflow
          </Link>
        </li>
        <li>
          <Link href="/docs/examples">Run an example project</Link>
        </li>
        <li>
          <Link href="/docs/scan">Read the scan command reference</Link>
        </li>
        <li>
          <Link href="/docs/tested-with">Check the tested-with matrix</Link>
        </li>
        <li>
          <Link href="/docs/comparison">Compare cms-lab with other tools</Link>
        </li>
        <li>
          <Link href="/docs/bug-examples">Review real bug examples</Link>
        </li>
        <li>
          <Link href="/docs/agent-context">Generate agent context files</Link>
        </li>
        <li>
          <Link href="/docs/versioning">Review stability and versioning</Link>
        </li>
        <li>
          <Link href="/docs/ci">Wire it into CI</Link>
        </li>
        <li>
          <Link href="/docs/diagnostics">Check diagnostic codes</Link>
        </li>
        <li>
          <Link href="/docs/troubleshooting">Fix common setup failures</Link>
        </li>
        <li>
          <Link href="/docs/large-catalogs">Scan larger catalogs safely</Link>
        </li>
      </ul>
    </DocsShell>
  );
}
