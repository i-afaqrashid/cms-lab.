import type { Metadata } from "next";
import Link from "next/link";

import { CodeBlock, DocsShell } from "../../components";

export const metadata: Metadata = {
  title: "Troubleshooting",
  description:
    "Common cms-lab setup failures, likely causes, fixes, and commands.",
};

const rows = [
  {
    symptom: "No Next.js project detected",
    cause:
      "The command is running in a CMS-only repo, a backend folder, or the wrong workspace directory.",
    fix: "Run scan from the frontend project when you want route checks. For backend-only planning, use CMS-only agent context.",
    command: "npx @cms-lab/cli agent-context --mode cms-only --preset all",
  },
  {
    symptom: "Config file not found",
    cause: "cms-lab could not find cms-lab.config.ts in the current directory.",
    fix: "Create the config with init, move into the project root, or pass --config.",
    command:
      "npx @cms-lab/cli init; npx @cms-lab/cli scan --config ./cms-lab.config.ts",
  },
  {
    symptom: "Config validation error",
    cause:
      "The config shape does not match the schema, or a required provider field is missing.",
    fix: "Run doctor, check the provider example, and keep secrets in environment variables.",
    command: "npx @cms-lab/cli doctor --config ./cms-lab.config.ts",
  },
  {
    symptom: "CMS auth failed or CMS unreachable",
    cause:
      "The CMS URL, repository name, token, permissions, or local CMS server is not available.",
    fix: "Verify the token outside cms-lab, start the local CMS, and rerun doctor before scan.",
    command: "CMS_TOKEN=... npx @cms-lab/cli doctor",
  },
  {
    symptom: "Site unreachable",
    cause:
      "The Next.js app is not running, site.url is wrong, or / is not the health route for a localized app.",
    fix: "Start the app and use site.healthPath or site.healthUrl when the first healthy page is not /.",
    command: "npx @cms-lab/cli scan --url http://localhost:3000",
  },
  {
    symptom: "Route returns 404 or 500",
    cause:
      "The CMS document resolved to a URL the app cannot serve, or the app throws while rendering that route.",
    fix: "Check the document slug, route mapping, frontend dynamic route, and data fetch.",
    command: "npx @cms-lab/cli explain CMS-ROUTE-404",
  },
  {
    symptom: "First scan is too noisy",
    cause:
      "The config maps too many content types at once, or existing CMS content has many known gaps.",
    fix: "Filter by type, run only one check group, or collect a baseline with fail-on never.",
    command: "npx @cms-lab/cli scan --type page --only routes --fail-on never",
  },
  {
    symptom: "Report, Markdown, JUnit, or Slack output is missing",
    cause:
      "The output flag was not passed, the destination path is not writable, or the webhook was rejected.",
    fix: "Use explicit output paths locally and keep webhook URLs in secrets.",
    command:
      "npx @cms-lab/cli scan --report .cms-lab/report.html --markdown .cms-lab/summary.md",
  },
];

export default function TroubleshootingPage() {
  return (
    <DocsShell
      active="/docs/troubleshooting"
      toc={[
        { href: "#start", label: "Start here" },
        { href: "#errors", label: "Common errors" },
        { href: "#doctor", label: "Doctor first" },
        { href: "#privacy", label: "Privacy" },
      ]}
    >
      <div className="breadcrumb">Docs / Troubleshooting</div>
      <h1>Troubleshooting</h1>
      <p className="lede">
        Most first-run failures are environment or config problems. Use{" "}
        <code>doctor</code> to check the config, framework, CMS connection, and
        site health before running a full scan.
      </p>

      <h2 id="start">Start here</h2>
      <CodeBlock>{`npx @cms-lab/cli doctor
npx @cms-lab/cli scan --fail-on never --report`}</CodeBlock>
      <p>
        Use <code>--fail-on never</code> while building the first baseline so
        the command writes artifacts even when diagnostics exist.
      </p>

      <h2 id="errors">Common errors</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Symptom</th>
            <th>Likely cause</th>
            <th>Fix</th>
            <th>Command</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.symptom}>
              <td>{row.symptom}</td>
              <td>{row.cause}</td>
              <td>{row.fix}</td>
              <td>
                <code>{row.command}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 id="doctor">When to use doctor</h2>
      <p>
        Run <code>doctor</code> after changing config, switching CMS tokens,
        changing site URLs, or moving a project between local and CI. Run{" "}
        <code>scan</code> after the app and CMS checks pass.
      </p>
      <p>
        If you only have a CMS/backend, start with{" "}
        <Link href="/docs/backend-only">the backend-only workflow</Link>. Route
        scans wait until a frontend or staging site exists, but agent-context
        generation can still be useful before that.
      </p>

      <h2 id="privacy">Privacy while debugging</h2>
      <p>
        Do not paste tokens, private URLs, raw CMS payloads, webhook URLs, or
        generated reports into public issues. Redacted JSON output is the right
        default for sharing.
      </p>
      <CodeBlock>{`npx @cms-lab/cli scan --json > cms-lab-redacted.json`}</CodeBlock>
    </DocsShell>
  );
}
