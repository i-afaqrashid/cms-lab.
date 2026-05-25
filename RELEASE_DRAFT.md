# Next GitHub Release Draft

Use this after the branch is merged, versions are bumped, and the release tag exists.

## Title

```txt
cms-lab vX.Y.Z
```

## Body

````md
## Highlights

- Use `npx @cms-lab/cli scan` for one-off runs.
- Added a no-secret broken Prismic demo for screenshots and launch testing.
- Added launch post drafts and growth planning docs.
- Added a GitHub social preview asset at `assets/social-preview.png`.
- Updated docs and site examples to use the scoped npm CLI command.

## Try It

```sh
npx @cms-lab/cli doctor
npx @cms-lab/cli scan --ci --report
```
````

## Demo

```sh
cd examples/broken-prismic-demo
npx @cms-lab/cli doctor
npx @cms-lab/cli scan --ci --report --fail-on never
```

## Notes

`@cms-lab/cli` is the public npm package and provides the installed `cms-lab`
binary. Use `npx @cms-lab/cli ...` for one-off launch copy, README snippets,
docs, and demos.

```

```
