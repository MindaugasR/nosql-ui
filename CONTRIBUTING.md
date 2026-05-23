# Contributing

## Getting started

1. Fork the repo
2. Create a branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Commit with a [Conventional Commit](https://www.conventionalcommits.org/) message
5. Push and open a PR against `main`

## Commit messages

This project uses [semantic-release](https://semantic-release.gitbook.io/) for automatic versioning — commit messages **must** follow [Conventional Commits](https://www.conventionalcommits.org/).

| Prefix             | When to use           | Version bump |
|--------------------|-----------------------|--------------|
| `feat:`            | New feature           | Minor        |
| `fix:`             | Bug fix               | Patch        |
| `chore:` / `docs:` | Maintenance / docs    | None         |
| `BREAKING CHANGE:` | Breaking API change   | Major        |

A git hook will reject commits that don't follow this format.

**Examples:**
```
feat: add index management view
fix: resolve connection timeout on slow networks
chore: update dependencies
```

## PR guidelines

- One PR per feature or fix
- CI must pass before merge
- At least one maintainer review required
- No force-pushing to `main`

## Local development

```bash
npm install
npm run dev
```

## Reporting bugs

Use the [bug report](.github/ISSUE_TEMPLATE/bug_report.yml) issue template.
