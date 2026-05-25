# Next GitHub Release Draft

Use this after the branch is merged, versions are bumped, and the release tag exists.

## Title

```txt
cms-lab vX.Y.Z
```

## Body

````md
## Highlights

- Added the short `cms-lab` npm package so users can run `npx cms-lab scan`.
- Added a no-secret broken Prismic demo for screenshots and launch testing.
- Added launch post drafts and growth planning docs.
- Added a GitHub social preview asset at `assets/social-preview.png`.
- Updated docs and site examples to use the short CLI command.

## Try It

```sh
npx cms-lab doctor
npx cms-lab scan --ci --report
```
````

## Demo

```sh
cd examples/broken-prismic-demo
npx cms-lab doctor
npx cms-lab scan --ci --report --fail-on never
```

## Notes

`@cms-lab/cli` remains the implementation package. The unscoped `cms-lab`
package is the short public entry point and should be used in launch copy,
README snippets, docs, and demos.

```

```
