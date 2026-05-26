import type { Metadata } from "next";
import Link from "next/link";

import { CodeBlock, DocsShell } from "../../components";

export const metadata: Metadata = {
  title: "Comparison",
  description:
    "How cms-lab fits with link checkers, Playwright, Lighthouse CI, and custom route crawls.",
};

const rows = [
  {
    tool: "lychee / linkinator",
    goodAt:
      "Finding broken links across URLs, Markdown, HTML, or crawled pages.",
    gap: "They do not know which CMS document produced a route, which field is required, or whether SEO/image fields are complete before rendering.",
    useTogether:
      "Use them for broad link coverage; use cms-lab for CMS document-to-route checks and content diagnostics.",
  },
  {
    tool: "Playwright",
    goodAt:
      "Browser flows, login paths, visual assertions, network checks, and project-specific smoke tests.",
    gap: "A CMS crawl has to be custom-built: fetch content, map routes, handle statuses, summarize diagnostics, and maintain reports.",
    useTogether:
      "Use Playwright for critical user journeys; use cms-lab for repeatable CMS content sweeps.",
  },
  {
    tool: "Lighthouse CI",
    goodAt:
      "Performance budgets, page-quality audits, accessibility signals, SEO signals, and CI gating for rendered pages.",
    gap: "It audits pages, not the CMS inventory behind them. It will not tell you that a content type has no route mapping or that a draft-like item is reachable.",
    useTogether:
      "Use Lighthouse CI for page quality; use cms-lab to choose and explain the CMS-driven pages that need checking.",
  },
  {
    tool: "next-sitemap + curl",
    goodAt:
      "Simple reachability checks for URLs that are already in a sitemap or route list.",
    gap: "It usually misses orphaned CMS entries, required field rules, provider statuses, image alt fields, and adapter-specific normalization.",
    useTogether:
      "Use curl loops for quick uptime checks; use cms-lab when the source of truth is CMS content.",
  },
];

export default function ComparisonPage() {
  return (
    <DocsShell
      active="/docs/comparison"
      toc={[
        { href: "#summary", label: "Summary" },
        { href: "#matrix", label: "Matrix" },
        { href: "#fit", label: "Good fit" },
        { href: "#not-fit", label: "Not a fit" },
        { href: "#commands", label: "Commands" },
      ]}
    >
      <div className="breadcrumb">Docs / Comparison</div>
      <h1>Comparison</h1>
      <p className="lede">
        cms-lab sits between CMS data and rendered routes. It does not replace
        link checkers, browser tests, Lighthouse, accessibility tools, or
        production monitoring.
      </p>

      <h2 id="summary">Short version</h2>
      <p>
        Most mature tools operate on URLs or pages. cms-lab starts from CMS
        documents, resolves the routes your app expects, probes those routes,
        and adds content diagnostics around fields, SEO, images, statuses, and
        report output.
      </p>

      <h2 id="matrix">Where it overlaps</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Tool</th>
            <th>Strong at</th>
            <th>CMS-aware gap</th>
            <th>Use together</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.tool}>
              <td>
                <strong>{row.tool}</strong>
              </td>
              <td>{row.goodAt}</td>
              <td>{row.gap}</td>
              <td>{row.useTogether}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 id="fit">When cms-lab is a good fit</h2>
      <ul>
        <li>
          Your CMS has many entries and only some should map to public routes.
        </li>
        <li>
          Route construction depends on CMS fields, relations, locale prefixes,
          or project-specific helper functions.
        </li>
        <li>
          Missing SEO fields, required fields, or image alt text should be
          visible before deploy.
        </li>
        <li>
          You want one local report that links diagnostics back to content type,
          path, and source document.
        </li>
      </ul>

      <h2 id="not-fit">When another tool is better</h2>
      <ul>
        <li>
          Use Playwright when the problem is user interaction, auth, checkout,
          browser state, or visual behavior.
        </li>
        <li>
          Use Lighthouse CI when the problem is performance, accessibility audit
          scoring, or rendered-page quality budgets.
        </li>
        <li>
          Use a link checker when the problem is broad link coverage across a
          site or documentation corpus.
        </li>
        <li>
          Use CMS-native validation when editors should be blocked before saving
          a bad entry.
        </li>
      </ul>

      <h2 id="commands">Common setup</h2>
      <p>
        In mature projects, these tools usually complement each other instead of
        replacing each other.
      </p>
      <CodeBlock>{`npx @cms-lab/cli scan --ci --report
npx playwright test
npx lhci autorun`}</CodeBlock>

      <p>
        Next steps: <Link href="/docs/scan">scan command</Link>,{" "}
        <Link href="/docs/ci">CI setup</Link>,{" "}
        <Link href="/docs/diagnostics">diagnostic codes</Link>, and{" "}
        <Link href="/docs/bug-examples">bug examples</Link>.
      </p>
    </DocsShell>
  );
}
