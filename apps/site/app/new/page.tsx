import type { Metadata } from "next";

import { exampleProjects, stackBlitzStarterUrl } from "../example-links";

export const metadata: Metadata = {
  title: "Open cms-lab example",
  description: "Open the cms-lab broken Prismic demo in StackBlitz.",
  openGraph: {
    title: "Open the cms-lab example in StackBlitz",
    description:
      "Opens the broken Prismic demo in StackBlitz. Includes a copyable command and runnable examples if the redirect does not start.",
    url: stackBlitzStarterUrl,
  },
};

export default function NewExamplePage() {
  return (
    <main className="sectionWrap pageHero">
      {/*
        Redirect to StackBlitz via JS only. The page is statically exported,
        so a server redirect() / Location header is not available here. The
        content below is a real fallback: with JS disabled (or if the redirect
        is blocked) the link, command, and examples all still work, instead of
        flashing a meta-refresh shim.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.location.replace(${JSON.stringify(stackBlitzStarterUrl)});`,
        }}
      />
      <div className="container heroGrid">
        <div className="heroCopy">
          <p className="eyebrow">cms-lab example</p>
          <h1>Open the example in StackBlitz.</h1>
          <p className="heroLead">
            This opens the broken Prismic demo in StackBlitz. If the redirect
            does not start, use the link or run it locally with the command
            below.
          </p>
          <div className="heroActions">
            <a className="btn btnPrimary" href={stackBlitzStarterUrl}>
              Open StackBlitz example
            </a>
          </div>
          <p className="heroNote">Or run a scan locally:</p>
          <pre className="codeblock">npx @cms-lab/cli scan</pre>
          <p className="heroNote">Runnable examples:</p>
          <ul>
            {exampleProjects.map((example) => (
              <li key={example.path}>
                <a href={example.url} rel="noreferrer" target="_blank">
                  {example.title}
                </a>{" "}
                - {example.copy}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
