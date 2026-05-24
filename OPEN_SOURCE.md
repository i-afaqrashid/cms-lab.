# Open Source

cms-lab is an open-source project released under the MIT license. The goal is to keep the project useful for real CMS and Next.js teams while making the contribution path clear, boring, and maintainable.

## License

cms-lab is licensed under the [MIT License](./LICENSE).

You may use, copy, modify, merge, publish, distribute, sublicense, and sell copies of the software under the terms of that license. The license notice must stay with substantial copies of the software.

## Contribution Model

Contributions are welcome through GitHub issues and pull requests. Before opening a PR, read [CONTRIBUTING.md](./CONTRIBUTING.md).

By contributing code, docs, tests, examples, or other project material, you agree that your contribution can be distributed under the same MIT license as the project.

cms-lab does not currently require a Contributor License Agreement.

## Maintainer Priorities

Maintainers prioritize:

- Correct CLI behavior.
- Real CMS adapter reliability.
- Accurate docs with no fake product claims.
- Secure handling of credentials and generated artifacts.
- Tests, benchmarks, and release checks that protect users from regressions.

Feature requests can be declined when they expand scope without improving the core promise: catch CMS bugs before deploy.

## Public Packages

The npm packages in this repository are intended to stay public:

- `cms-lab`
- `@cms-lab/core`
- `@cms-lab/next`
- `@cms-lab/prismic`
- `@cms-lab/strapi`
- `@cms-lab/directus`
- `@cms-lab/wordpress`
- `@cms-lab/reporter`

Each package declares MIT licensing in `package.json` and includes a package-level `LICENSE` file for npm tarballs.

## Security

Do not report vulnerabilities in public issues. Follow [SECURITY.md](./SECURITY.md).

## Support

Use [SUPPORT.md](./SUPPORT.md) to choose the right path for bugs, questions, feature requests, and CMS adapter requests.
