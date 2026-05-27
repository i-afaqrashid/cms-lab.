import type { Metadata } from "next";

import { CodeBlock, DocsShell } from "../../../components";

export const metadata: Metadata = {
  title: "Research: ISR / cache staleness vs CMS state",
  description:
    "Notes on detecting Next.js ISR / cache staleness against the CMS source of truth, with signal availability, detection strategies, and a decision on whether to ship the check.",
};

export default function IsrStalenessResearchPage() {
  return (
    <DocsShell
      active="/docs/research/isr-staleness"
      toc={[
        { href: "#problem", label: "Problem" },
        { href: "#signals", label: "Signals" },
        { href: "#cms-updated-at", label: "CMS updatedAt" },
        { href: "#strategies", label: "Strategies" },
        { href: "#decision", label: "Decision" },
      ]}
    >
      <div className="breadcrumb">Docs / Research / ISR staleness</div>
      <h1>ISR / cache staleness vs CMS state</h1>
      <p className="lede">
        Suggested by{" "}
        <a
          href="https://github.com/vercel/next.js/discussions/94112#discussioncomment-17071164"
          rel="noreferrer"
          target="_blank"
        >
          @MahdiJDS
        </a>{" "}
        in the Next.js launch discussion. This page is a research note, not a
        committed feature. The goal is to decide whether and at what severity
        cms-lab should ship a check for &quot;page exists, returns 200, but the
        cached HTML is older than the CMS doc&quot;.
      </p>

      <h2 id="problem">What we are trying to catch</h2>
      <p>
        A Next.js page rendered via ISR (or a similar cache layer on Vercel,
        Netlify, or self-hosted) can be older than the CMS source of truth. The
        page exists, returns HTTP 200, looks fine to a casual visitor, but the
        CMS document was updated two hours ago and the cached HTML is
        twenty-four hours old. From the user&apos;s perspective the site is
        stale.
      </p>
      <p>
        cms-lab does not currently see this. Route probing only inspects the
        HTTP status code, and even with the new soft-404 detection the body is
        only compared against not-found markers, not against CMS doc timestamps.
      </p>

      <h2 id="signals">Signal sources</h2>
      <p>
        Three layers can hint that a response was served from cache, with
        varying detail:
      </p>
      <h3>1. Response headers (host-provided)</h3>
      <ul>
        <li>
          <code>x-vercel-cache: HIT | STALE | MISS | BYPASS</code> on Vercel.
          Reliable, easy to inspect, but Vercel-only.
        </li>
        <li>
          <code>x-nextjs-cache</code> in self-hosted Next.js when the cache
          handler exposes it. Less consistent than the Vercel header.
        </li>
        <li>
          <code>cf-cache-status</code>, <code>x-cache</code>, and{" "}
          <code>age</code> from Cloudflare / AWS CloudFront / Fastly. The{" "}
          <code>age</code> header in particular gives a numeric seconds-since
          generation that we can compare to the CMS doc&apos;s{" "}
          <code>updatedAt</code>.
        </li>
      </ul>
      <h3>2. Response body markers</h3>
      <ul>
        <li>
          Some frameworks emit build-time timestamps as comments or meta tags (
          <code>&lt;meta name=&quot;generator&quot;</code>, last-built dates).
          Available on some sites, missing on most.
        </li>
      </ul>
      <h3>3. CMS-side timestamps</h3>
      <ul>
        <li>
          Every supported CMS exposes some form of <code>updatedAt</code> /{" "}
          <code>last_publication_date</code> on the document. That is the source
          of truth we want to compare against.
        </li>
      </ul>

      <h2 id="cms-updated-at">CMS updatedAt per provider</h2>
      <ul>
        <li>
          <strong>Prismic.</strong> Document has{" "}
          <code>last_publication_date</code> at the top level. Available on
          every document the REST API returns.
        </li>
        <li>
          <strong>Strapi.</strong> Entry has <code>updatedAt</code> when{" "}
          <code>populate=*</code> includes meta. Per-locale also gets its own{" "}
          <code>updatedAt</code> on the localized entry.
        </li>
        <li>
          <strong>Directus.</strong> System field <code>date_updated</code> on
          every collection item, plus <code>user_updated</code>. Enabled by
          default in most projects.
        </li>
        <li>
          <strong>WordPress.</strong> <code>modified</code> and{" "}
          <code>modified_gmt</code> on posts / pages.
        </li>
        <li>
          <strong>Contentful.</strong> <code>sys.updatedAt</code> on every entry
          returned from the Delivery API.
        </li>
        <li>
          <strong>Sanity.</strong> <code>_updatedAt</code> on every document.
        </li>
      </ul>
      <p>
        All six adapters already preserve the original CMS payload in{" "}
        <code>data</code>, so any check can read these fields without additional
        adapter changes.
      </p>

      <h2 id="strategies">Detection strategies and tradeoffs</h2>
      <h3>Strategy A: Compare CMS updatedAt against response Age</h3>
      <CodeBlock>{`age = response.headers.get("age") ?? response.headers.get("x-vercel-cache-age")
updatedAt = doc.last_publication_date ?? doc._updatedAt ?? doc.modified ?? doc.updatedAt
if (age && updatedAt && Date.now() - parseInt(age) * 1000 < new Date(updatedAt).getTime()) {
  // cache predates the CMS update -> staleness
}`}</CodeBlock>
      <p>Pros: works wherever a host exposes Age. No body read needed.</p>
      <p>
        Cons: Age is in seconds since generation, not since publication. Some
        hosts reset Age on revalidation in ways that hide staleness. Only
        meaningful when the host advertises Age in the first place.
      </p>

      <h3>Strategy B: Vercel-specific x-vercel-cache header</h3>
      <CodeBlock>{`cacheStatus = response.headers.get("x-vercel-cache")
if (cacheStatus === "STALE") {
  // stale-while-revalidate; the user got an old response
}`}</CodeBlock>
      <p>
        Pros: Vercel users get this for free, very high signal-to-noise.
        Captures the SWR window where staleness most matters.
      </p>
      <p>
        Cons: Locks the check to Vercel. Doesn&apos;t fire on the much more
        common &quot;HIT but really old&quot; case where Next.js is keeping a
        HIT cached longer than the CMS doc has existed.
      </p>

      <h3>Strategy C: Inline build / revalidate timestamp in the page</h3>
      <CodeBlock>{`<meta name="cms-lab:generated-at" content="2026-05-27T15:00:00Z" />`}</CodeBlock>
      <p>
        Pros: explicit. Zero ambiguity. Works on any host. Adopters opt in once
        in their framework layout.
      </p>
      <p>
        Cons: requires every adopter to wire it. Not a fit for the default
        out-of-box experience. Best paired with framework adapters as an
        optional helper.
      </p>

      <h3>Strategy D: Probe with a freshness hint and trust the host</h3>
      <p>
        Send a request with <code>Cache-Control: no-cache</code> and compare
        body / headers to the cached response on the same path. Detects
        differences between &quot;what you see cached&quot; and &quot;what the
        origin would serve right now&quot;.
      </p>
      <p>Pros: framework / host agnostic. Highest signal.</p>
      <p>
        Cons: two requests per route. Doubles the route-probe cost. May evict
        cache entries that the adopter wanted to keep. Riskier and rarer use
        case.
      </p>

      <h2 id="decision">Decision</h2>
      <p>
        Ship as an <strong>opt-in info-level check</strong>, grouped per content
        type, with Strategy A as the default and an explicit{" "}
        <code>checks.routes.staleness</code> block to enable it. Strategy B
        layers on cleanly for Vercel adopters. Strategy C and D stay out of
        scope for the first iteration.
      </p>
      <p>
        Severity is <em>info</em>, not warning, because:
      </p>
      <ul>
        <li>
          False positives are easy without a careful Age threshold per adopter;
          failing CI on those would burn trust fast.
        </li>
        <li>
          Staleness is a real concern but rarely a release-blocker. Info
          surfaces it without changing exit codes.
        </li>
        <li>
          Adopters who want to enforce it can already do so today via{" "}
          <code>--strict</code> or <code>--max-info 0</code>.
        </li>
      </ul>
      <p>
        Diagnostic code reserved: <code>CMS-ROUTE-STALE</code>. No
        implementation yet. This page exists so the question is recorded and the
        next iteration of the project knows where to start.
      </p>
    </DocsShell>
  );
}
