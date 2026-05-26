# Next.js + Prismic Example Config

This folder is a copy/reference example for testing `cms-lab` in a real Next.js App Router project.

## Run in StackBlitz

[Run in StackBlitz](https://stackblitz.com/fork/github/i-afaqrashid/cms-lab/tree/main/examples/next-prismic?title=cms-lab%20Next%20Prismic%20config)

This example is mainly a config reference. For a demo that intentionally
produces diagnostics, use `examples/broken-prismic-demo`.

## Run locally

Copy `cms-lab.config.ts` into your Next.js project root, then update the repository name and route mappings.

```sh
cp cms-lab.config.ts /path/to/your-next-project/cms-lab.config.ts
```

Then from the target project:

```sh
CMS_LAB_ROOT=/path/to/cms-lab
node "$CMS_LAB_ROOT"/packages/cli/dist/bin.js scan --config cms-lab.config.ts
```
