import Link from "next/link";
import { CodeBlock, Terminal } from "./components";
import { CmsLogo, FeatureIcon } from "./icons";

const checks = [
  {
    icon: "routes" as const,
    label: "Reachability",
    title: "Published entries that lead to a dead page",
    copy: "cms-lab turns each mapped CMS document into the URL your app should serve, probes that URL, and flags 404s, 500s, fetch errors, and invalid responses before deploy.",
    signal: "Expected URL, HTTP status, source document.",
  },
  {
    icon: "fields" as const,
    label: "Required data",
    title: "Fields your templates assume are present",
    copy: "If a page needs fields like title, author.name, heroImage, or launchDate, the scan checks the configured paths and reports the exact missing value.",
    signal: "Field path, content type, affected document.",
  },
  {
    icon: "seo" as const,
    label: "Share previews",
    title: "Pages that look unfinished in search and chat",
    copy: "Missing titles and descriptions create vague search snippets and weak link previews. cms-lab catches empty metadata before those pages are indexed or shared.",
    signal: "Document, missing metadata fields.",
  },
  {
    icon: "images" as const,
    label: "Image content",
    title: "Image fields with empty or placeholder alt text",
    copy: "Hero images, galleries, nested slices, and repeatable groups are walked recursively so empty strings and placeholder alt text do not ship.",
    signal: "Exact image field path.",
  },
  {
    icon: "uid" as const,
    label: "Route mapping",
    title: "CMS types that never become pages",
    copy: "Content types without a configured route, or entries missing the UID your route pattern needs, are reported instead of silently disappearing from the site.",
    signal: "Type, UID state, route pattern.",
  },
  {
    icon: "ci" as const,
    label: "URL builders",
    title: "Route functions that throw or point outside the site",
    copy: "When a getPath function throws, returns an invalid path, or resolves outside the configured site origin, cms-lab reports it as a configuration problem.",
    signal: "Route type, sanitized error, safe path.",
  },
];

const adapters = [
  { logo: "prismic" as const, name: "Prismic" },
  { logo: "strapi" as const, name: "Strapi" },
  { logo: "directus" as const, name: "Directus" },
  { logo: "wordpress" as const, name: "WordPress" },
  { logo: "contentful" as const, name: "Contentful" },
  { logo: "sanity" as const, name: "Sanity" },
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="wrap heroInner">
          <div className="heroCopy">
            <h1>Catch CMS bugs before deploy.</h1>
            <p className="heroSub">
              cms-lab checks your CMS content against your Next.js routes so
              broken pages, missing fields, SEO gaps, and image alt text issues
              are caught before customers see them.
            </p>
            <p className="heroNote">
              Free open-source CLI. Runs locally, uses your CMS credentials, and
              does not send content to a hosted cms-lab service.
            </p>
            <div className="heroActions">
              <span className="commandPill" aria-label="Run command">
                <span className="prompt">$</span>
                <span>npx cms-lab scan</span>
              </span>
              <Link className="btn btnPrimary" href="/docs">
                Read docs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="sectionHead">
            <span className="sectionTag">Output</span>
            <h2 className="sectionTitle">Run it before deploy.</h2>
          </div>
          <Terminal title="cms-lab scan">
            <span className="tMuted">$</span> npx cms-lab scan
            {"\n\n"}
            <span className="tBold">cms-lab</span>
            {"\n"}checked your Next.js routes and CMS content{"\n\n"}
            <span className="tWarn">warnings</span>
            {"\n"} Missing meta description on About{"\n"}
            {"  "}Image alt text is empty on Blog / Launch notes{"\n\n"}
            <span className="tMuted">summary</span>
            {"\n"} errors <span className="tOk">0</span>
            {"\n"} warnings <span className="tWarn">2</span>
            {"\n\n"}
            <span className="tOk">scan completed</span>
            {"\n"}report written to .cms-lab/report.html
          </Terminal>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="sectionHead">
            <span className="sectionTag">Checks</span>
            <h2 className="sectionTitle">
              The content failures cms-lab catches.
            </h2>
          </div>
          <div className="checkGrid">
            {checks.map((check) => (
              <article className="checkCard" key={check.title}>
                <div className="checkTop">
                  <span className="featureIcon">
                    <FeatureIcon name={check.icon} />
                  </span>
                  <span className="checkLabel">{check.label}</span>
                </div>
                <h3>{check.title}</h3>
                <p>{check.copy}</p>
                <div className="checkSignal">{check.signal}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <div>
            <div className="sectionHead">
              <span className="sectionTag">Setup</span>
              <h2 className="sectionTitle">
                Config-first, so your route rules stay explicit.
              </h2>
            </div>
            <CodeBlock>{`import { defineConfig } from "@cms-lab/core";

export default defineConfig({
  site: { url: "http://localhost:3000" },
  framework: { type: "next", router: "app" },
  cms: {
    provider: "prismic",
    repositoryName: "my-repo",
    accessToken: process.env.PRISMIC_ACCESS_TOKEN,
  },
  routes: [
    { type: "page", pattern: "/:uid", getPath: (doc) => "/" + doc.uid },
    { type: "article", pattern: "/articles/:uid", getPath: (doc) => "/articles/" + doc.uid },
  ],
});`}</CodeBlock>
          </div>
          <div>
            <div className="panel">
              <h3>Adapters</h3>
              <p className="muted">
                Connect the CMS you already use, map content types to routes,
                and scan the same way across providers.
              </p>
              <div className="adapterList">
                {adapters.map((adapter) => (
                  <div className="adapter" key={adapter.name}>
                    <span
                      className={`adapterLogo adapterLogo${adapter.name}`}
                      aria-hidden="true"
                    >
                      <CmsLogo name={adapter.logo} />
                    </span>
                    <strong>{adapter.name}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel">
              <h3>Private by default</h3>
              <p className="muted">
                cms-lab runs where your app runs. It does not require a
                dashboard account, and the hosted cms-lab service does not
                exist.
              </p>
              <p className="muted">
                JSON output redacts raw CMS payloads unless you explicitly ask
                for sensitive output.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
