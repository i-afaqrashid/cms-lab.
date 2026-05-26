import type { Metadata } from "next";
import Link from "next/link";

import { CodeBlock, DocsShell } from "../../components";

export const metadata: Metadata = {
  title: "Large Catalogs",
  description:
    "How to run cms-lab against larger CMS catalogs without making the first scan noisy or slow.",
};

export default function LargeCatalogsPage() {
  return (
    <DocsShell
      active="/docs/large-catalogs"
      toc={[
        { href: "#baseline", label: "Baseline" },
        { href: "#narrow", label: "Narrow scope" },
        { href: "#tune", label: "Tune probes" },
        { href: "#ci", label: "CI" },
        { href: "#outputs", label: "Outputs" },
        { href: "#limits", label: "Limits" },
      ]}
    >
      <div className="breadcrumb">Docs / Large catalogs</div>
      <h1>Large catalog scanning</h1>
      <p className="lede">
        Large CMS projects need a baseline before they need a hard gate. Start
        with focused scans, tune route probing, then decide which checks should
        block deploys.
      </p>

      <h2 id="baseline">Build a first baseline</h2>
      <p>
        For catalogs with thousands of entries, do not start with the strictest
        CI command. Write a report first, review the noisy content types, and
        only then raise thresholds.
      </p>
      <CodeBlock>{`npx @cms-lab/cli doctor
npx @cms-lab/cli scan --report --markdown --fail-on never`}</CodeBlock>

      <h2 id="narrow">Narrow the scope</h2>
      <p>
        Use <code>--type</code> when one collection is the deploy risk. Use{" "}
        <code>--only</code> when you need a focused pass on route reachability,
        fields, SEO, or image checks.
      </p>
      <CodeBlock>{`npx @cms-lab/cli scan --type menu_item --only routes
npx @cms-lab/cli scan --type branch --type category --only fields,seo
npx @cms-lab/cli scan --skip images --fail-on never`}</CodeBlock>

      <h2 id="tune">Tune route probes</h2>
      <p>
        The default concurrency is conservative. Increase it only when your
        local app, staging site, and CMS can handle the load. Increase timeout
        when the app renders slow pages. Use retries for transient 5xx or
        network failures, not for deterministic broken routes.
      </p>
      <CodeBlock>{`npx @cms-lab/cli scan --concurrency 4 --timeout 10000 --retries 2
npx @cms-lab/cli scan --type product --concurrency 12 --only routes`}</CodeBlock>

      <h2 id="ci">Local scans versus CI scans</h2>
      <p>
        Local scans can be broad because a developer is watching the report. CI
        scans should start with critical content types and known deploy risks.
        Once the baseline is clean, tighten the failure threshold.
      </p>
      <CodeBlock>{`npx @cms-lab/cli scan --ci --type menu_item --only routes --report --fail-on error
npx @cms-lab/cli scan --ci --type page --only fields,seo --max-warnings 0`}</CodeBlock>

      <h2 id="outputs">Outputs for large results</h2>
      <ul>
        <li>
          Use <code>--report</code> for human review and filtering.
        </li>
        <li>
          Use <code>--markdown</code> for release notes or PR summaries.
        </li>
        <li>
          Use <code>--junit</code> when CI should display failures as test
          results.
        </li>
        <li>
          Use <code>--json</code> for custom scripts or annotations.
        </li>
        <li>
          Keep <code>--include-sensitive-output</code> off unless the output
          stays private.
        </li>
      </ul>

      <h2 id="limits">Current limits</h2>
      <p>
        cms-lab can narrow, probe, and report large route and field-check
        workflows. It does not yet implement deep cross-document business rules
        such as "every active menu item must have one pricing record per
        branch." Track those as custom relationship checks rather than treating
        basic route scanning as proof of relational correctness.
      </p>
      <p>
        Next steps: <Link href="/docs/scan">scan command</Link>,{" "}
        <Link href="/docs/tested-with">adapter maturity</Link>, and{" "}
        <Link href="/docs/troubleshooting">troubleshooting</Link>.
      </p>
    </DocsShell>
  );
}
