import type { Metadata } from "next";
import Link from "next/link";

import { DocsShell } from "../../components";
import { providerDocs } from "./provider-data";

export const metadata: Metadata = {
  title: "Provider Docs",
  description:
    "Provider-specific cms-lab setup pages for supported CMS adapters.",
};

export default function ProvidersPage() {
  return (
    <DocsShell
      active="/docs/providers"
      toc={[{ href: "#providers", label: "Providers" }]}
    >
      <div className="breadcrumb">Docs / Providers</div>
      <h1>Provider docs</h1>
      <p className="lede">
        Each provider uses the same scan model: fetch CMS documents, normalize
        stable IDs and route fields, resolve paths, and run checks against a
        running site.
      </p>

      <h2 id="providers">Supported providers</h2>
      <div className="pathList">
        {providerDocs.map((provider) => (
          <div className="pathItem" key={provider.slug}>
            <strong>{provider.name}</strong>
            <p>{provider.summary}</p>
            <Link href={`/docs/providers/${provider.slug}`}>
              Read {provider.name}
            </Link>
          </div>
        ))}
      </div>
    </DocsShell>
  );
}
