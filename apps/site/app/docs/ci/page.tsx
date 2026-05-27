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
        { href: "#copy-paste", label: "Copy-paste workflow" },
        { href: "#thresholds", label: "Thresholds" },
        { href: "#baseline", label: "Baseline" },
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
      <CodeBlock>{`- uses: i-afaqrashid/cms-lab@v1
  with:
    config: cms-lab.config.ts
    report: true
    fail-on: error`}</CodeBlock>

      <p>For teams that prefer explicit shell steps:</p>
      <h2 id="copy-paste">Copy-paste workflow</h2>
      <p>
        This workflow builds the app, starts it, waits for the local URL, runs
        cms-lab, and uploads the HTML report even when the scan fails.
      </p>
      <CodeBlock>{`name: cms-lab
on: [pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
      - run: corepack enable
      - run: corepack prepare pnpm@10.33.4 --activate
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm start &
      - run: pnpm dlx wait-on http://localhost:3000
      - run: npx @cms-lab/cli scan --ci --report
      - uses: actions/upload-artifact@v7
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

      <h2 id="baseline">Baseline</h2>
      <p>
        Turning cms-lab on against an existing repo with legacy warnings is
        easier with a baseline. Capture the current diagnostics once, commit the
        file, and subsequent scans exit 0 unless something new appears.
      </p>
      <CodeBlock>{`# capture the current diagnostics
npx @cms-lab/cli baseline write

# commit the file so CI uses the same set
git add .cms-lab/baseline.json
git commit -m "chore: cms-lab baseline"

# scan in CI; only NEW diagnostics fail the build
npx @cms-lab/cli scan --ci

# ignore the baseline temporarily to see everything
npx @cms-lab/cli scan --ci --no-baseline`}</CodeBlock>
      <p>
        The baseline file is small, human-readable JSON. Inspect it before
        committing and shrink it over time as you fix the legacy diagnostics and
        re-run <code>cms-lab baseline write</code>.
      </p>

      <h2 id="artifacts">Artifacts</h2>
      <p>
        The report is a self-contained HTML file. It can be opened locally,
        uploaded as a CI artifact, or attached to release notes.
      </p>
      <CodeBlock>{`npx @cms-lab/cli scan --ci --report --share-report`}</CodeBlock>
      <div className="callout">
        <strong>Keep reports private</strong>
        Reports stay in your workspace unless your CI uploads them. Treat report
        artifacts as project data when they include route paths or CMS type
        names. Use <code>--share-report</code> for public issue attachments; it
        removes CMS source IDs and local project paths from the HTML report.
      </div>
    </DocsShell>
  );
}
