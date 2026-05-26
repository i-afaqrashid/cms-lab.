import type { Metadata } from "next";
import Link from "next/link";

import { CodeBlock, DocsShell } from "../../components";
import { exampleProjects } from "../../example-links";

export const metadata: Metadata = {
  title: "Examples",
  description:
    "Runnable cms-lab examples for learning scans, reports, and config shape.",
};

export default function ExamplesPage() {
  return (
    <DocsShell
      active="/docs/examples"
      toc={[
        { href: "#browser", label: "Browser examples" },
        { href: "#local", label: "Local run" },
        { href: "#config-examples", label: "Config examples" },
        { href: "#github-actions", label: "GitHub Actions" },
      ]}
    >
      <div className="breadcrumb">Docs / Examples</div>
      <h1>Runnable examples</h1>
      <p className="lede">
        Open a small project, run cms-lab, and inspect the report. These
        examples are backed by folders in the public repository so they can be
        checked in CI and kept honest.
      </p>

      <h2 id="browser">Run in a browser workspace</h2>
      <p>
        StackBlitz opens the GitHub example folder directly. GitHub stays the
        source of truth, and each example includes the commands and expected
        diagnostics in its README.
      </p>
      <table className="table">
        <thead>
          <tr>
            <th>Example</th>
            <th>What it shows</th>
            <th>Open</th>
          </tr>
        </thead>
        <tbody>
          {exampleProjects.map((example) => (
            <tr key={example.path}>
              <td>
                <strong>{example.title}</strong>
                <br />
                <code>{example.path}</code>
              </td>
              <td>{example.copy}</td>
              <td>
                <a href={example.url}>Run in StackBlitz</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 id="local">Run locally</h2>
      <p>
        Local runs are still the most accurate way to test a project that needs
        private CMS tokens, staging URLs, or a real Next.js server.
      </p>
      <CodeBlock>{`cd examples/broken-prismic-demo
npx @cms-lab/cli doctor
npx @cms-lab/cli scan --ci --report --markdown --junit --fail-on never`}</CodeBlock>

      <h2 id="config-examples">Config examples</h2>
      <p>
        Some examples are documentation-first because they need a real CMS and a
        real frontend before they can be runnable in a browser workspace.
      </p>
      <ul>
        <li>
          <Link href="/docs/examples/directus-restaurant">
            Directus restaurant catalog
          </Link>
        </li>
      </ul>

      <h2 id="github-actions">Use it in GitHub Actions</h2>
      <p>
        The Marketplace Action uses the same CLI. Start with the browser
        examples, then wire the same config into CI when the project scan is
        useful.
      </p>
      <CodeBlock>{`- uses: i-afaqrashid/cms-lab@v1
  with:
    config: cms-lab.config.ts
    report: true`}</CodeBlock>
      <p>
        See <Link href="/docs/ci">CI setup</Link> for artifact upload and
        threshold options.
      </p>
    </DocsShell>
  );
}
