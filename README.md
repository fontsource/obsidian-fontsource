# Fontsource for Obsidian

![Hero Image](./hero.png)

Fontsource imports fonts from the [Fontsource](https://fontsource.org/) directory and makes them available throughout Obsidian, including popout windows.

This version requires Obsidian 1.12 or newer.

## Usage

1. Open **Settings → Fontsource**.
2. Import a font from the Fontsource directory.
3. Enable the imported font.
4. Choose where to use it: interface, text, or monospace.

Multiple fonts can be selected for each role and ordered by precedence to cover additional languages.

## Network and storage

The plugin connects only while listing or importing fonts:

- `api.fontsource.org` provides the font directory and metadata.
- `cdn.jsdelivr.net` provides the selected WOFF2 font files.

Imported fonts are encoded into CSS files under your vault's configured Obsidian folder at `fonts/<font-id>.css`. The plugin reads and writes only those cache files through Obsidian's vault adapter and stores your selections in its normal plugin settings. Once imported, fonts load from the local cache.

## Development

This project requires Node.js 22.13 or newer and pnpm 11. CI uses Node.js 24.

```sh
pnpm install
pnpm check
```

Run `pnpm dev` to watch the source and write a development bundle into `test-vault/.obsidian/plugins/fontsource`. See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution and release details.

## License

[MIT](LICENSE)
