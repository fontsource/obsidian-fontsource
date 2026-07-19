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

Releases use the Fontsource GitHub App configured through the `RELEASE_APP_CLIENT_ID` organization variable and `RELEASE_APP_PRIVATE_KEY` organization secret.
