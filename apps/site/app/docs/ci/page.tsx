import type { Metadata } from "next";
import { CodeBlock, DocsShell } from "../../components";

export const metadata: Metadata = {
  title: "CI",
  description: "Run cms-lab in CI and upload the HTML report artifact.",
};

export default function CiPage() {
  return (
    <DocsShell
      active="/docs/ci"
      toc={[
        { href: "#github-actions", label: "GitHub Actions" },
        { href: "#thresholds", label: "Thresholds" },
        { href: "#artifacts", label: "Artifacts" },
      ]}
    >
      <div className="breadcrumb">Docs / CI</div>
      <h1>CI setup</h1>
      <p className="lede">
        Run cms-lab after your app is built and serving. The scanner exits with
        a stable status code and can produce a single static HTML report
        artifact.
      </p>

      <h2 id="github-actions">GitHub Actions</h2>
      <CodeBlock>{`name: cms-lab
on: [pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm start &
      - run: npx wait-on http://localhost:3000
      - run: npx @cms-lab/cli scan --ci --report
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: cms-lab-report
          path: .cms-lab/report.html`}</CodeBlock>

      <h2 id="thresholds">Thresholds</h2>
      <p>
        By default, errors fail the job and warnings do not. Tighten that after
        the project has a baseline.
      </p>
      <CodeBlock>{`npx @cms-lab/cli scan --ci --fail-on error
npx @cms-lab/cli scan --ci --fail-on warning
npx @cms-lab/cli scan --ci --max-warnings 0
npx @cms-lab/cli scan --ci --max-info 0
npx @cms-lab/cli scan --ci --strict
npx @cms-lab/cli scan --ci --fail-on never`}</CodeBlock>

      <h2 id="artifacts">Artifacts</h2>
      <p>
        The report is a self-contained HTML file. It can be opened locally,
        uploaded as a CI artifact, or attached to release notes.
      </p>
      <div className="callout">
        <strong>Keep reports private</strong>
        Reports stay in your workspace unless your CI uploads them. Treat report
        artifacts as project data when they include route paths, CMS type names,
        or document sources.
      </div>
    </DocsShell>
  );
}
