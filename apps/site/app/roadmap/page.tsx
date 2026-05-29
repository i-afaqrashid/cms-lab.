import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Roadmap",
  description:
    "What cms-lab has recently shipped, what is planned next, and the research-stage ideas under consideration.",
  openGraph: {
    title: "cms-lab roadmap",
    description:
      "Recently shipped, planned next, and research-stage ideas for cms-lab.",
    images: [{ url: "/assets/report-preview.png" }],
  },
};

const ISSUES = "https://github.com/i-afaqrashid/cms-lab/issues";

type Item = {
  title: string;
  detail: string;
  href?: string;
};

const now: Item[] = [
  {
    title: "Custom rule API",
    detail:
      "checks.custom for project-specific invariants, with declarative asserts and a functional escape hatch.",
    href: `${ISSUES}/74`,
  },
  {
    title: "Payload CMS adapter",
    detail:
      "@cms-lab/payload fetches and normalizes Payload REST content for the same route, field, SEO, and image checks.",
    href: `${ISSUES}/67`,
  },
  {
    title: "Duplicate route detection",
    detail:
      "CMS-ROUTE-DUPLICATE flags two published documents that resolve to the same path; only one wins at runtime.",
  },
  {
    title: "Canonical, OG, and JSON-LD checks",
    detail:
      "Opt-in route-level SEO: canonical link validation, Open Graph / X (Twitter) card fields, and JSON-LD structured data.",
    href: `${ISSUES}/76`,
  },
  {
    title: "Localization completeness",
    detail:
      "checks.localization flags content groups missing a published translation in a configured locale.",
    href: `${ISSUES}/73`,
  },
  {
    title: "Status-aware relationships",
    detail:
      "CMS-RELATIONSHIP-UNPUBLISHED flags a published document whose relationships resolve only to drafts.",
    href: `${ISSUES}/71`,
  },
  {
    title: "Soft-404 detection",
    detail:
      "Flags 2xx responses whose body looks like a not-found page via checks.routes.soft404.",
    href: `${ISSUES}/115`,
  },
  {
    title: "Baseline and compare",
    detail:
      "Accept current diagnostics as a baseline and diff two scan reports, so a first run only surfaces new drift.",
    href: `${ISSUES}/113`,
  },
];

const next: Item[] = [
  {
    title: "Parallel CMS document fetch",
    detail:
      "Fetch collections concurrently with a bounded pool to speed up scans of large multi-collection catalogs.",
  },
  {
    title: "Streaming scan for large catalogs",
    detail:
      "Yield diagnostics as they are produced instead of buffering the full document set in memory.",
  },
  {
    title: "Watch mode for local development",
    detail:
      "cms-lab watch re-runs the scan as content and config change during local dev.",
  },
];

const later: Item[] = [
  {
    title: "Schema-to-code drift detection",
    detail:
      "Compare CMS schema against the fields the app reads, to catch renamed or removed fields before they break a page.",
    href: `${ISSUES}/75`,
  },
  {
    title: "Content-scoped visual regression",
    detail:
      "Catch content changes that visually break a route without changing its status code.",
    href: `${ISSUES}/77`,
  },
  {
    title: "Synthetic content fuzzing",
    detail:
      "Generate edge-case content (empty, oversized, missing relations) to surface fragile rendering paths.",
    href: `${ISSUES}/78`,
  },
];

function Section({
  id,
  title,
  lead,
  items,
}: {
  id: string;
  title: string;
  lead: string;
  items: Item[];
}) {
  return (
    <section className="roadmapSection">
      <h2 id={id}>{title}</h2>
      <p>{lead}</p>
      <ul className="roadmapList">
        {items.map((item) => (
          <li key={item.title}>
            <strong>
              {item.href ? (
                <a href={item.href} rel="noreferrer" target="_blank">
                  {item.title}
                </a>
              ) : (
                item.title
              )}
            </strong>
            <span>{item.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function RoadmapPage() {
  return (
    <main className="sectionWrap">
      <div className="container roadmap">
        <p className="eyebrow">cms-lab</p>
        <h1>Roadmap</h1>
        <p className="heroLead">
          What recently landed, what is planned next, and the research-stage
          ideas under consideration. Each item links to its GitHub issue.
          Priorities shift with real feedback, so this is a direction, not a
          commitment.
        </p>

        <Section
          id="now"
          title="Now"
          lead="Recently shipped and on the latest main."
          items={now}
        />
        <Section
          id="next"
          title="Next"
          lead="Planned and scoped, not yet built."
          items={next}
        />
        <Section
          id="later"
          title="Later / research"
          lead="Worth doing once the design and real-world need are clearer."
          items={later}
        />

        <section className="roadmapSection">
          <h2 id="shipped">Shipped history</h2>
          <p>
            The full release history lives in{" "}
            <a
              href="https://github.com/i-afaqrashid/cms-lab/blob/main/CHANGELOG.md"
              rel="noreferrer"
              target="_blank"
            >
              CHANGELOG.md
            </a>
            . Recent releases added relationship checks, grouped diagnostic
            summaries, expanded secret redaction, and the GitHub Action.
          </p>
        </section>

        <section className="roadmapSection">
          <h2 id="suggest">Suggest something</h2>
          <p>
            Have a check or adapter you need? Open a{" "}
            <a
              href="https://github.com/i-afaqrashid/cms-lab/discussions"
              rel="noreferrer"
              target="_blank"
            >
              discussion
            </a>{" "}
            or an{" "}
            <a href={ISSUES} rel="noreferrer" target="_blank">
              issue
            </a>
            . Real use cases move items up this list. See the{" "}
            <Link href="/docs">docs</Link> to get started.
          </p>
        </section>
      </div>
    </main>
  );
}
