# cms-lab

Catch CMS bugs before deploy.

This package provides the short npm entry point for the cms-lab CLI:

```sh
npx cms-lab scan
```

The implementation lives in `@cms-lab/cli`. Use this package when you want the shortest command in docs, demos, CI, or one-off local scans.

## Usage

```sh
npx cms-lab init
npx cms-lab doctor
npx cms-lab scan --ci --report
```

For project installs:

```sh
pnpm add -D cms-lab @cms-lab/core
pnpm cms-lab scan
```

Docs: https://cmslab.afaqrashid.com

Repository: https://github.com/i-afaqrashid/cms-lab
