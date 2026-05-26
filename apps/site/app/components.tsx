import Link from "next/link";
import type { ReactNode } from "react";

export type DocLink = {
  href: string;
  label: string;
};

export const docsNav: Array<{ title: string; links: DocLink[] }> = [
  {
    title: "Start",
    links: [
      { href: "/docs", label: "Overview" },
      { href: "/docs/configuration", label: "Configuration" },
      { href: "/docs/backend-only", label: "Backend-only" },
      { href: "/docs/scan", label: "Scan command" },
      { href: "/docs/examples", label: "Examples" },
      { href: "/docs/tested-with", label: "Tested with" },
      { href: "/docs/comparison", label: "Comparison" },
      { href: "/docs/agent-context", label: "Agent context" },
      { href: "/docs/versioning", label: "Versioning" },
    ],
  },
  {
    title: "Providers",
    links: [
      { href: "/docs/providers", label: "All providers" },
      { href: "/docs/providers/prismic", label: "Prismic" },
      { href: "/docs/providers/strapi", label: "Strapi" },
      { href: "/docs/providers/directus", label: "Directus" },
      { href: "/docs/providers/wordpress", label: "WordPress" },
      { href: "/docs/providers/contentful", label: "Contentful" },
      { href: "/docs/providers/sanity", label: "Sanity" },
    ],
  },
  {
    title: "Run",
    links: [
      { href: "/docs/ci", label: "CI" },
      { href: "/docs/diagnostics", label: "Diagnostics" },
      { href: "/docs/troubleshooting", label: "Troubleshooting" },
      { href: "/docs/large-catalogs", label: "Large catalogs" },
      { href: "/docs/bug-examples", label: "Bug examples" },
    ],
  },
];

export function Terminal({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <figure className="terminal">
      <figcaption className="terminalChrome">
        <span className="traffic" aria-hidden="true">
          <span className="trafficDot red" />
          <span className="trafficDot yellow" />
          <span className="trafficDot green" />
        </span>
        <span>{title}</span>
      </figcaption>
      <pre className="terminalBody">{children}</pre>
    </figure>
  );
}

export function CodeBlock({ children }: { children: ReactNode }) {
  return <pre className="codeblock">{children}</pre>;
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function DocsShell({
  active,
  children,
  toc,
}: {
  active: string;
  children: ReactNode;
  toc?: DocLink[];
}) {
  return (
    <div className="wrap docsWrap">
      <aside className="sideNav" aria-label="Docs navigation">
        {docsNav.map((group) => (
          <div className="sideGroup" key={group.title}>
            <div className="sideTitle">{group.title}</div>
            {group.links.map((link) => (
              <Link
                className={active === link.href ? "active" : undefined}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </aside>
      <article className="docsMain">{children}</article>
      <aside className="toc" aria-label="On this page">
        <div className="tocTitle">On this page</div>
        {(toc ?? []).map((link) => (
          <a href={link.href} key={link.href}>
            {link.label}
          </a>
        ))}
      </aside>
    </div>
  );
}

export function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "bad" | "warn" | "good" | "info";
}) {
  return (
    <div className={`metric ${tone ?? ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function DiagnosticCode({
  code,
  severity,
  group,
  children,
}: {
  code: string;
  severity: "error" | "warning" | "info" | "mixed";
  group: string;
  children: ReactNode;
}) {
  const severityClass = severity === "mixed" ? "warning" : severity;
  const severityLabel = severity === "mixed" ? "error or warning" : severity;

  return (
    <tr>
      <td>
        <code>{code}</code>
      </td>
      <td>
        <span className={`severity ${severityClass}`}>{severityLabel}</span>
      </td>
      <td>{group}</td>
      <td>{children}</td>
    </tr>
  );
}
