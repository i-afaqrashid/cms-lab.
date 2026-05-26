export type ExampleProject = {
  copy: string;
  path: string;
  title: string;
  url: string;
};

const stackBlitzBase =
  "https://stackblitz.com/fork/github/i-afaqrashid/cms-lab/tree/main";

function stackBlitzExampleUrl(path: string, title: string) {
  const encodedTitle = encodeURIComponent(`cms-lab ${title}`);

  return `${stackBlitzBase}/${path}?title=${encodedTitle}`;
}

export const exampleProjects: ExampleProject[] = [
  {
    path: "examples/broken-prismic-demo",
    title: "Broken Prismic demo",
    copy: "A no-secret Next.js fixture that scans a public Prismic starter and intentionally produces useful route, field, SEO, and image diagnostics.",
    url: stackBlitzExampleUrl(
      "examples/broken-prismic-demo",
      "Broken Prismic demo",
    ),
  },
  {
    path: "examples/next-prismic",
    title: "Next Prismic config",
    copy: "A compact App Router reference for copying cms-lab config into an existing Next.js + Prismic project.",
    url: stackBlitzExampleUrl("examples/next-prismic", "Next Prismic config"),
  },
];

export const stackBlitzStarterUrl = exampleProjects[0]!.url;
