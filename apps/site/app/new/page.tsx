import type { Metadata } from "next";

import { stackBlitzStarterUrl } from "../example-links";

export const metadata: Metadata = {
  title: "Open cms-lab example",
  description: "Open the cms-lab broken Prismic demo in StackBlitz.",
};

export default function NewExamplePage() {
  return (
    <main className="sectionWrap pageHero">
      <meta httpEquiv="refresh" content={`0;url=${stackBlitzStarterUrl}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.location.replace(${JSON.stringify(stackBlitzStarterUrl)});`,
        }}
      />
      <div className="container heroGrid">
        <div className="heroCopy">
          <p className="eyebrow">cms-lab example</p>
          <h1>Opening StackBlitz.</h1>
          <p className="heroLead">
            The browser example opens from the public GitHub folder. If the
            redirect does not start, use the link below.
          </p>
          <div className="heroActions">
            <a className="btn btnPrimary" href={stackBlitzStarterUrl}>
              Open StackBlitz example
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
