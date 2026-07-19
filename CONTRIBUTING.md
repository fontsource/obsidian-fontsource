# Contributing

Issues and pull requests are welcome. For a substantial behavior change, please open an issue first so the intended scope can be agreed before implementation.

## Local development

Use Node.js 22.13 or newer and the pnpm version declared in `package.json`. CI uses Node.js 24.

```sh
pnpm install
pnpm dev
```

Before opening a pull request, run the same checks as CI:

```sh
pnpm check
```

Keep changes focused and use [Conventional Commits](https://www.conventionalcommits.org/) such as `fix: handle failed font downloads` or `feat: add a font role`. Release Please uses these commits to determine the next version and generate release notes.

## Releases

Merging the Release Please pull request creates a draft GitHub release. CI rebuilds the plugin, attests and uploads `main.js` and `manifest.json`, and publishes the release only after all checks pass.

Maintainers should configure a `RELEASE_PLEASE_TOKEN` repository secret if they want pull request workflows to run for bot-created release pull requests. Without it, Release Please falls back to `GITHUB_TOKEN`; the release workflow still validates the generated branch itself, but GitHub does not emit follow-up workflow events for resources created with that token.

When using the fallback token, the repository or organization must also allow GitHub Actions to create pull requests.
