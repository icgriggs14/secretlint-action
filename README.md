# secretlint-action

> **GitHub Action CI companion for secretlint — automatically detects leaked API keys, tokens, and credentials on every pull request.**

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-secretlint--action-blue?logo=github)](https://github.com/marketplace/actions/secretlint-action)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Stop credential leaks before they reach your main branch. `secretlint-action` runs [secretlint](https://github.com/secretlint/secretlint) on every PR, posts a structured findings summary as a PR comment, and fails CI if secrets are detected.

**Compliance baseline:** Detecting leaked API keys, AWS credentials, GitHub tokens, and passwords is required by SOC2, HIPAA, and PCI-DSS. This Action automates that check for your entire team.

---

## Quick Start

```yaml
# .github/workflows/secretlint.yml
name: Credential Security Scan

on:
  pull_request:
    types: [opened, synchronize, reopened]
  push:
    branches: [main, master]

jobs:
  secretlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: icgriggs14/secretlint-action@v1
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `fail_on_error` | Fail CI if secrets/credentials are detected | `true` |
| `paths` | Glob pattern for files to scan | `**/*` |
| `config` | Path to `.secretlintrc` config file (optional) | `''` |
| `github_token` | GitHub token for posting PR comments | `${{ github.token }}` |
| `working_directory` | Directory to run secretlint in | `.` |

## Outputs

| Output | Description |
|--------|-------------|
| `finding_count` | Total number of credential/secret findings |
| `passed` | `true` if no secrets detected, `false` otherwise |

## Advanced Configuration

### Custom secretlint rules

Create `.secretlintrc` in your repo root:

```json
{
  "rules": [
    { "id": "@secretlint/secretlint-rule-preset-recommend" }
  ]
}
```

Then reference it:

```yaml
- uses: icgriggs14/secretlint-action@v1
  with:
    config: '.secretlintrc'
```

### Scan specific directories only

```yaml
- uses: icgriggs14/secretlint-action@v1
  with:
    paths: 'src/**/* config/**/*'
    fail_on_error: 'true'
```

### Non-blocking scan (warn but don't fail)

```yaml
- uses: icgriggs14/secretlint-action@v1
  with:
    fail_on_error: 'false'
```

## What secretlint detects

secretlint scans for 50+ credential patterns including:

- **AWS**: Access keys, secret keys, session tokens
- **GitHub**: Personal access tokens, OAuth tokens, app tokens
- **Google Cloud**: Service account keys, API keys
- **Slack**: Bot tokens, webhook URLs
- **Generic patterns**: Private keys (RSA, EC, PGP), JWT tokens, database connection strings
- **npm**: Auth tokens, `.npmrc` credentials
- And 40+ more via the [recommend preset](https://github.com/secretlint/secretlint/tree/master/packages/%40secretlint/secretlint-rule-preset-recommend)

## PR Comment Example

When credentials are found, `secretlint-action` posts a structured PR comment:

```
🚨 secretlint — FAILED — secrets/credentials detected

3 finding(s) detected:

| File | Rule | Finding |
|------|------|---------|
| config/app.js | @secretlint/secretlint-rule-aws | AWS_SECRET_ACCESS_KEY detected |
| .env.example | @secretlint/secretlint-rule-github | GitHub personal access token detected |
| src/api.js | @secretlint/secretlint-rule-privatekey | Private RSA key detected |

> Compliance note: Leaked credentials violate SOC2, HIPAA, and PCI-DSS requirements.
> Rotate any exposed secrets immediately via your credential provider dashboard.
```

## About secretlint

[secretlint](https://github.com/secretlint/secretlint) is the leading Node.js credential/secret linter by [@azu](https://github.com/azu) — an actively maintained, widely trusted OSS security tool with ~100-300K weekly npm downloads.

`secretlint-action` fills the gap between the secretlint CLI and GitHub CI — providing a plug-and-play Marketplace Action so your team can enforce credential hygiene without hand-authoring CI workflows.

---

## Support this project

If `secretlint-action` saves you from a credential leak or simplifies your CI setup, consider sponsoring:

**[❤️ Sponsor on GitHub Sponsors](https://github.com/sponsors/icgriggs14)**

Your support funds continued development of open-source developer tools.

---

## Related Actions

All on [icgriggs14](https://github.com/icgriggs14) — zero-friction CI companions:

- [claude-pr-review](https://github.com/icgriggs14/claude-pr-review) — AI-powered PR code review
- [claude-changelog-action](https://github.com/icgriggs14/claude-changelog-action) — Auto-generate changelogs
- [claude-test-writer](https://github.com/icgriggs14/claude-test-writer) — Auto-generate test cases
- [react-doctor-action](https://github.com/icgriggs14/react-doctor-action) — React codebase diagnostics
- [knip-action](https://github.com/icgriggs14/knip-action) — Dead-code elimination CI

## License

MIT © [icgriggs14](https://github.com/icgriggs14)
