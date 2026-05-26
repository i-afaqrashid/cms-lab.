import type { Metadata } from "next";
import Image from "next/image";
import { CodeBlock, DocsShell } from "../../components";

export const metadata: Metadata = {
  title: "Bug Examples",
  description: "Real CMS failure modes cms-lab is built to catch.",
};

export default function BugExamplesPage() {
  return (
    <DocsShell
      active="/docs/bug-examples"
      toc={[
        { href: "#examples", label: "Examples" },
        { href: "#demo", label: "Demo screenshot" },
      ]}
    >
      <div className="breadcrumb">Docs / Bug examples</div>
      <h1>Bug examples</h1>
      <p className="lede">
        These are ordinary CMS problems that can ship without a code diff:
        changed slugs, missing fields, weak SEO metadata, and incomplete image
        content.
      </p>

      <h2 id="examples">Examples</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Failure</th>
            <th>What cms-lab reports</th>
            <th>Typical fix</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Published CMS entry resolves to a page that returns 404.</td>
            <td>
              <code>CMS-ROUTE-404</code> with the sanitized path and CMS source.
            </td>
            <td>Fix the slug, route mapping, or dynamic route data fetch.</td>
          </tr>
          <tr>
            <td>
              A template expects <code>author.name</code>, but the field is
              blank.
            </td>
            <td>
              <code>CMS-FIELD-MISSING</code> for the configured field path.
            </td>
            <td>
              Fill the content or make the template handle the missing value.
            </td>
          </tr>
          <tr>
            <td>
              SEO title or description is empty in provider-native fields.
            </td>
            <td>
              <code>SEO-META-MISSING</code> on the affected document.
            </td>
            <td>
              Add metadata in the CMS or map the project-specific SEO fields.
            </td>
          </tr>
          <tr>
            <td>Hero image has no useful alt text.</td>
            <td>
              <code>A11Y-IMG-ALT</code> with the nested image field path.
            </td>
            <td>
              Write specific alt text or mark decorative images in the app.
            </td>
          </tr>
          <tr>
            <td>
              One template repeats the same issue across many CMS documents.
            </td>
            <td>
              A repeated-finding group such as <code>page /:uid</code> plus the
              full row-level diagnostics.
            </td>
            <td>
              Fix the shared route/template code or bulk-edit the affected CMS
              records.
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id="demo">Demo screenshot</h2>
      <p>
        The CLI output is intentionally plain so it works in local terminals and
        CI logs.
      </p>
      <Image
        alt="cms-lab terminal output showing route and field diagnostics"
        className="docsImage"
        height={720}
        src="/assets/demo-scan.svg"
        width={1180}
      />
      <CodeBlock>{`npx @cms-lab/cli scan --ci --report

cms-lab
project next pages
documents 39

errors
  CMS-ROUTE-404 - Route /blog/missing returned 404

warnings
  CMS-FIELD-MISSING - Document article-12 is missing data.author.name
  SEO-META-MISSING - Document page-7 is missing meta_description

scan failed - 1 error`}</CodeBlock>
    </DocsShell>
  );
}
