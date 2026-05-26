import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CodeBlock, DocsShell } from "../../../components";
import { getProviderDoc, providerDocs } from "../provider-data";

type PageProps = {
  params: Promise<{ provider: string }>;
};

export function generateStaticParams() {
  return providerDocs.map((provider) => ({ provider: provider.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { provider: slug } = await params;
  const provider = getProviderDoc(slug);

  return {
    title: provider ? `${provider.name} Provider` : "Provider",
    description: provider?.summary,
  };
}

export default async function ProviderPage({ params }: PageProps) {
  const { provider: slug } = await params;
  const provider = getProviderDoc(slug);

  if (!provider) {
    notFound();
  }

  return (
    <DocsShell
      active={`/docs/providers/${provider.slug}`}
      toc={[
        { href: "#install", label: "Install" },
        { href: "#config", label: "Config" },
        { href: "#fields", label: "Fields" },
        { href: "#ci", label: "CI" },
        { href: "#caveats", label: "Caveats" },
      ]}
    >
      <div className="breadcrumb">Docs / Providers / {provider.name}</div>
      <h1>{provider.name}</h1>
      <p className="lede">{provider.summary}</p>

      <h2 id="install">Install</h2>
      <p>
        For CLI scans, <code>@cms-lab/cli</code> includes the bundled adapter.
        Add <code>@cms-lab/core</code> for <code>defineConfig</code>. Install{" "}
        <code>{provider.packageName}</code> only when importing the adapter
        directly in project code or tests.
      </p>
      <CodeBlock>{`pnpm add -D @cms-lab/cli @cms-lab/core
pnpm add -D ${provider.packageName}`}</CodeBlock>

      <h2 id="config">Config</h2>
      <CodeBlock>{provider.config}</CodeBlock>

      <h2 id="fields">UID and URL field mapping</h2>
      <p>
        Use <code>uidField</code> when the route key lives in a custom nested
        CMS field. Use <code>urlField</code> when the CMS stores the public
        permalink. Both read dotted paths from <code>document.data</code>.
      </p>
      <CodeBlock>{provider.fieldMapping}</CodeBlock>

      <h2 id="ci">CI command</h2>
      <CodeBlock>{`npx @cms-lab/cli doctor
npx @cms-lab/cli scan --ci --report --fail-on error`}</CodeBlock>

      <h2 id="caveats">Provider caveats</h2>
      <ul>
        {provider.caveats.map((caveat) => (
          <li key={caveat}>{caveat}</li>
        ))}
      </ul>
      <p>
        Check the <Link href="/docs/tested-with">adapter maturity matrix</Link>{" "}
        before using this provider as a strict deploy gate.
      </p>
      {provider.slug === "directus" ? (
        <p>
          For a larger relational setup, read the{" "}
          <Link href="/docs/examples/directus-restaurant">
            Directus restaurant catalog example
          </Link>
          .
        </p>
      ) : null}
    </DocsShell>
  );
}
