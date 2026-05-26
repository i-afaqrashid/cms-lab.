import type { Metadata } from "next";
import Link from "next/link";

import { CodeBlock, DocsShell } from "../../components";

export const metadata: Metadata = {
  title: "Versioning and stability",
  description:
    "How cms-lab handles stable commands, config changes, adapter maturity, and releases.",
};

export default function VersioningPage() {
  return (
    <DocsShell
      active="/docs/versioning"
      toc={[
        { href: "#status", label: "Status" },
        { href: "#stable", label: "Stable" },
        { href: "#changes", label: "Changes" },
        { href: "#adapters", label: "Adapters" },
        { href: "#adoption", label: "Adoption" },
        { href: "#releases", label: "Releases" },
      ]}
    >
      <div className="breadcrumb">Docs / Versioning</div>
      <h1>Versioning and stability</h1>
      <p className="lede">
        cms-lab is public and usable, but it is still early. The project keeps
        command behavior, config shape, and adapter maturity explicit so teams
        can decide how much trust to put behind a scan.
      </p>

      <h2 id="status">Current status</h2>
      <p>
        The CLI is best treated as a local pre-deploy check for projects that
        can provide a clear CMS-to-route mapping. It is not a replacement for
        unit tests, Playwright, Lighthouse, axe, CMS permissions, or production
        monitoring.
      </p>
      <div className="callout">
        <strong>No hosted dependency</strong>
        The scan runs inside your project and reads only the CMS endpoints and
        site URLs you configure. Reports are local files unless you choose to
        upload them in CI.
      </div>

      <h2 id="stable">What should stay stable</h2>
      <ul>
        <li>
          Core commands: <code>init</code>, <code>doctor</code>,{" "}
          <code>scan</code>, <code>agent-context</code>, and{" "}
          <code>explain</code>.
        </li>
        <li>
          Common scan outputs: terminal, JSON, Markdown, JUnit, Slack summaries,
          and local HTML reports.
        </li>
        <li>
          Diagnostic severity names: <code>error</code>, <code>warning</code>,
          and <code>info</code>.
        </li>
        <li>
          The main config entry point: <code>defineConfig</code> from{" "}
          <code>@cms-lab/core</code>.
        </li>
      </ul>

      <h2 id="changes">What may still change</h2>
      <p>
        Minor releases can refine adapter options, generated init templates,
        report layout, diagnostic wording, and docs examples. Any breaking
        change to command names, config keys, or JSON output should ship in a
        major release unless the existing behavior is broken or unsafe.
      </p>
      <p>
        Deprecations should be announced in the changelog first. When practical,
        the CLI should warn before removing an option.
      </p>

      <h2 id="adapters">Adapter maturity</h2>
      <p>
        CMS adapters do not all have the same coverage. Check the public matrix
        before treating an adapter as a deploy gate for a new project.
      </p>
      <p>
        <Link href="/docs/tested-with">Open the tested-with matrix</Link>
      </p>

      <h2 id="adoption">How to adopt safely</h2>
      <ol>
        <li>Run locally with a small route set first.</li>
        <li>
          Add <code>--fail-on never</code> in CI until the first report matches
          your team&apos;s expectations.
        </li>
        <li>Pin the package version in production projects.</li>
        <li>Review generated reports before turning warnings into failures.</li>
        <li>
          Keep secrets in environment variables and do not commit generated
          reports with private CMS data.
        </li>
      </ol>
      <CodeBlock>{`npx @cms-lab/cli scan --ci --report --fail-on never`}</CodeBlock>

      <h2 id="releases">Release notes</h2>
      <p>
        Every public release should be reflected in the changelog and GitHub
        Releases. Patch releases should be safe bug fixes or docs updates. Minor
        releases can add adapters, output formats, commands, or checks. Major
        releases are for intentional breaking changes.
      </p>
      <p>
        Read the{" "}
        <a href="https://github.com/i-afaqrashid/cms-lab/blob/main/CHANGELOG.md">
          changelog
        </a>{" "}
        and{" "}
        <a href="https://github.com/i-afaqrashid/cms-lab/releases">
          GitHub Releases
        </a>
        .
      </p>
    </DocsShell>
  );
}
