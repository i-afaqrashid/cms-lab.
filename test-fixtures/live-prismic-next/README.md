# Live Prismic + Next Fixture

This fixture scans a real public Prismic repository and a deployed Next.js App Router starter site.

It uses:

- Prismic repository: `nextjs-starter-prismic-blog`
- Site URL: `https://nextjs-starter-prismic-blog.vercel.app`

Run from the repository root after building packages:

```sh
pnpm build
pnpm live:doctor
pnpm live:scan
```

Expected result: `doctor` exits `0`, and `scan` exits `0` if the public starter content and deployment remain healthy. The scan intentionally runs only route and required-field checks so external editorial warnings in the demo repository do not make the smoke test flaky.

This fixture depends on public Prismic and Vercel services and is intentionally
not part of `pnpm verify`.
