# Release Checklist

Run this checklist before publishing.

```sh
pnpm install --frozen-lockfile
pnpm verify
pnpm audit
pnpm smoke:pack
```

Then run live Prismic checks:

```sh
pnpm smoke:pack:live
pnpm live:doctor
pnpm live:scan
pnpm -r --filter './packages/*' pack --pack-destination /tmp/cms-lab-pack
npm whoami
```

The pack smoke installs the tarballs into a clean temporary app before running the CLI. The live fixture runs route and required-field checks against a real public Prismic repository and should exit `0` unless the public starter repo or deployment changes.

Publishing requires npm auth and ownership of the unscoped `cms-lab` package plus the `@cms-lab/*` scope.
