# Support

cms-lab support happens through GitHub issues and project docs. There is no paid support channel or hosted cms-lab service.

## Before Opening An Issue

Check:

- [README.md](./README.md)
- [TESTING.md](./TESTING.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [SECURITY.md](./SECURITY.md), if credentials or data exposure may be involved.

Run the most relevant command with debug output:

```sh
cms-lab doctor --debug --verbose 2
cms-lab scan --debug --verbose 2
```

Debug output is written to stderr. Remove secrets, access tokens, cookies, private CMS URLs, and private content before sharing logs.

## Where To Ask

- Bug reports: use the bug report issue template.
- Feature requests: use the feature request issue template.
- CMS adapter requests: use the CMS adapter issue template.
- Security issues: follow [SECURITY.md](./SECURITY.md), not public issues.

## Useful Details

Good reports include:

- cms-lab version.
- Node.js and pnpm versions.
- Operating system.
- CMS provider and version.
- Next.js version and router type.
- The command you ran.
- Redacted config.
- Redacted output.
- Expected behavior and actual behavior.

For adapter bugs, include a small redacted CMS API response whenever possible.
