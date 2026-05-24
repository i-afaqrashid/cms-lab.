# Security Policy

cms-lab runs locally in a user's project and may read CMS credentials from config or environment variables. Treat credential handling, debug logging, report output, and generated artifacts as security-sensitive.

## Supported Versions

Security fixes target the current `1.x` line.

## Reporting A Vulnerability

Do not open a public issue for a suspected vulnerability.

Send a private report to the maintainer listed in the repository owner profile, or use GitHub private vulnerability reporting if it is enabled for the repository.

Include:

- A clear description of the issue.
- A minimal reproduction.
- Affected command, package, or adapter.
- Whether credentials, tokens, local files, or CMS data can be exposed.
- Any suggested fix, if known.

## Security Expectations

Contributions must not:

- Log access tokens, bearer tokens, CMS credentials, or credential-bearing URLs.
- Send CMS data to a cms-lab hosted service.
- Add telemetry without explicit opt-in design and review.
- Include secrets in fixtures, generated reports, screenshots, or benchmark output.
- Read files outside the target project unless the command clearly requires it.

Debug output belongs on stderr and must stay redacted.

## Dependency Reports

For dependency vulnerabilities, include:

- Package name and version.
- Advisory link or CVE.
- Reachability from cms-lab runtime code.
- Proposed upgrade or mitigation.
