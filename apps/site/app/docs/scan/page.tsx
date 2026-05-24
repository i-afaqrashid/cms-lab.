import type { Metadata } from "next";
import { CodeBlock, DocsShell, Terminal } from "../../components";

export const metadata: Metadata = {
  title: "Scan Command",
  description: "cms-lab scan command options, output, and exit codes.",
};

export default function ScanPage() {
  return (
    <DocsShell
      active="/docs/scan"
      toc={[
        { href: "#synopsis", label: "Synopsis" },
        { href: "#flags", label: "Flags" },
        { href: "#exit-codes", label: "Exit codes" },
        { href: "#json", label: "JSON" },
      ]}
    >
      <div className="breadcrumb">Docs / CLI / scan</div>
      <h1>cms-lab scan</h1>
      <p className="lede">
        Fetch CMS documents, resolve configured routes, probe your running site,
        run content checks, and return a CI-friendly exit code.
      </p>

      <h2 id="synopsis">Run a scan</h2>
      <p>
        This is the basic command. Add flags when you need JSON, a local HTML
        report, stricter CI behavior, or a different config file.
      </p>
      <CodeBlock>{`npx @cms-lab/cli scan [options]`}</CodeBlock>
      <Terminal title="scan example">
        <span className="tMuted">$</span> npx @cms-lab/cli scan --ci --only
        routes,fields{"\n\n"}
        cms-lab{"\n"}project next app{"\n"}documents 6{"\n\n"}
        <span className="tInfo">info</span>
        {"\n"} CMS-ROUTE-UNMAPPED - Document settings has no configured route
        mapping{"\n\n"}
        <span className="tMuted">summary</span>
        {"\n"} errors 0{"\n"} warnings 0{"\n"} info 2{"\n\n"}
        <span className="tOk">scan passed</span>
      </Terminal>

      <h2 id="flags">Flags</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Flag</th>
            <th>Default</th>
            <th>Use</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>--url &lt;url&gt;</code>
            </td>
            <td>
              <code>config.site.url</code>
            </td>
            <td>Override the site URL for local, preview, or staging scans.</td>
          </tr>
          <tr>
            <td>
              <code>--config &lt;path&gt;</code>
            </td>
            <td>
              <code>cms-lab.config.ts</code>
            </td>
            <td>Load a specific config file.</td>
          </tr>
          <tr>
            <td>
              <code>--json</code>
            </td>
            <td>false</td>
            <td>
              Print ScanResult JSON to stdout with raw document data, URLs,
              UIDs, and local project paths redacted.
            </td>
          </tr>
          <tr>
            <td>
              <code>--include-sensitive-output</code>
            </td>
            <td>false</td>
            <td>
              Include raw CMS document payloads and local project paths in{" "}
              <code>--json</code> output.
            </td>
          </tr>
          <tr>
            <td>
              <code>--ci</code>
            </td>
            <td>false</td>
            <td>Use stable non-color terminal output for pipelines.</td>
          </tr>
          <tr>
            <td>
              <code>--no-color</code>
            </td>
            <td>false</td>
            <td>
              Disable ANSI color in terminal output. Color is also disabled when{" "}
              <code>NO_COLOR</code> is set, <code>TERM=dumb</code>, stdout is
              not a terminal, or <code>--ci</code> is used.
            </td>
          </tr>
          <tr>
            <td>
              <code>--report [path]</code>
            </td>
            <td>false</td>
            <td>
              Write an HTML report. Default path is{" "}
              <code>.cms-lab/report.html</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>--markdown [path]</code>
            </td>
            <td>false</td>
            <td>
              Write a Markdown summary. Default path is{" "}
              <code>.cms-lab/summary.md</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>--junit [path]</code>
            </td>
            <td>false</td>
            <td>
              Write a JUnit XML report. Default path is{" "}
              <code>.cms-lab/junit.xml</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>--slack-webhook &lt;url&gt;</code>
            </td>
            <td>none</td>
            <td>
              Post a compact, redacted summary to a Slack incoming webhook.
            </td>
          </tr>
          <tr>
            <td>
              <code>--notify-on &lt;mode&gt;</code>
            </td>
            <td>failure</td>
            <td>
              Slack notification mode: <code>always</code>, <code>failure</code>
              , or <code>diagnostics</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>--type &lt;type&gt;</code>
            </td>
            <td>all</td>
            <td>
              Limit documents by content type. Repeatable and comma-separated.
            </td>
          </tr>
          <tr>
            <td>
              <code>--only &lt;group&gt;</code>
            </td>
            <td>all</td>
            <td>
              Run only selected groups: <code>routes</code>, <code>seo</code>,{" "}
              <code>a11y</code>, <code>images</code>, <code>fields</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>--skip &lt;group&gt;</code>
            </td>
            <td>none</td>
            <td>Skip selected check groups.</td>
          </tr>
          <tr>
            <td>
              <code>--timeout &lt;ms&gt;</code>
            </td>
            <td>5000</td>
            <td>Per-route HTTP timeout.</td>
          </tr>
          <tr>
            <td>
              <code>--concurrency &lt;count&gt;</code>
            </td>
            <td>8</td>
            <td>Maximum concurrent route probes.</td>
          </tr>
          <tr>
            <td>
              <code>--retries &lt;count&gt;</code>
            </td>
            <td>1</td>
            <td>Retry transient route probe failures.</td>
          </tr>
          <tr>
            <td>
              <code>--fail-on &lt;level&gt;</code>
            </td>
            <td>error</td>
            <td>
              Exit threshold: <code>error</code>, <code>warning</code>, or{" "}
              <code>never</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>--max-warnings &lt;count&gt;</code>
            </td>
            <td>none</td>
            <td>Fail when warnings exceed this count.</td>
          </tr>
          <tr>
            <td>
              <code>--max-info &lt;count&gt;</code>
            </td>
            <td>none</td>
            <td>Fail when info diagnostics exceed this count.</td>
          </tr>
          <tr>
            <td>
              <code>--strict</code>
            </td>
            <td>false</td>
            <td>
              Fail on any warning or info diagnostic. Equivalent to{" "}
              <code>--fail-on warning --max-info 0</code>.
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id="exit-codes">Exit codes</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>0</code>
            </td>
            <td>Scan completed under the fail threshold.</td>
          </tr>
          <tr>
            <td>
              <code>1</code>
            </td>
            <td>Scan completed with diagnostics at or above the threshold.</td>
          </tr>
          <tr>
            <td>
              <code>2</code>
            </td>
            <td>Config, load, validation, or CLI usage error.</td>
          </tr>
          <tr>
            <td>
              <code>3</code>
            </td>
            <td>CMS unreachable or authentication failed.</td>
          </tr>
          <tr>
            <td>
              <code>4</code>
            </td>
            <td>Site URL unreachable.</td>
          </tr>
        </tbody>
      </table>

      <h2 id="json">JSON</h2>
      <p>
        Use <code>--json</code> for custom scripts or annotations. Raw document
        payloads, URLs, UIDs, and local project paths are redacted by default,
        and HTML, Markdown, JUnit, or Slack outputs can be produced at the same
        time without changing stdout.
      </p>
      <p>
        Slack webhook messages are intentionally smaller than local files: they
        include counts and diagnostic codes, not raw CMS payloads, local paths,
        webhook URLs, or full diagnostic JSON.
      </p>
      <CodeBlock>{`{
  "project": {
    "framework": "next",
    "router": "app",
    "rootDir": "[redacted: pass --include-sensitive-output to emit raw project paths]"
  },
  "documents": [
    {
      "id": "Yabc",
      "type": "page",
      "status": "published",
      "data": "[redacted: pass --include-sensitive-output to emit raw CMS data]"
    }
  ],
  "diagnostics": [
    {
      "severity": "error",
      "code": "CMS-ROUTE-404",
      "message": "Route /about returned 404",
      "path": "/about",
      "source": "prismic:page#Yabc"
    }
  ],
  "summary": { "errors": 1, "warnings": 0, "info": 0 }
}`}</CodeBlock>
    </DocsShell>
  );
}
