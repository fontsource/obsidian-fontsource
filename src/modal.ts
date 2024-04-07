import { type App, Notice, requestUrl, SuggestModal } from 'obsidian';
import type FontsourcePlugin from './main';

interface Font {
	name: string;
}

type FontlistResponse = Record<string, string>;

const getFontlist = async (): Promise<Font[]> => {
	const response = await requestUrl(
		'https://api.fontsource.org/fontlist?family'
	);
	const json: FontlistResponse = await response.json();

	return Object.keys(json).map((name) => ({ name }));
};

export class SearchModal extends SuggestModal<Font> {
	private plugin: FontsourcePlugin;
	// Cache the list of fonts to avoid fetching it multiple times
	private listCache: Font[];

	constructor(app: App, plugin: FontsourcePlugin) {
		super(app);
		this.plugin = plugin;

		this.inputEl.placeholder = 'Select to import a font...';
		this.emptyStateText = 'No fonts found. :(';
	}

	// Trigger refresh on import
	onImported(): void {}

	getSuggestions(query: string): Font[] {
		const list = this.listCache;
		if (!list) {
			getFontlist().then((fonts) => {
				this.listCache = fonts;
				return fonts.filter((font) =>
					font.name.toLowerCase().includes(query.toLowerCase())
				);
			});
		}

		return list.filter((font) =>
			font.name.toLowerCase().includes(query.toLowerCase())
		);
	}

	renderSuggestion(item: Font, el: HTMLElement): void {
		el.setText(item.name);
	}

	onChooseSuggestion(font: Font, _evt: MouseEvent | KeyboardEvent) {
		new Notice(`Importing ${font.name}...`);
		this.onImported();

		// TODO: IMPORT FONTS

		new Notice(`Imported ${font.name}.`);
	}
}
