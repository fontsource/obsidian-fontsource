import { type App, Notice, requestUrl, SuggestModal } from 'obsidian';
import type FontsourcePlugin from './main';
import { importFont } from './import';

interface Font {
	id: string;
	family: string;
}

type FontlistResponse = Record<string, string>;

const getFontlist = async (): Promise<Font[]> => {
	const response = (await requestUrl(
		'https://api.fontsource.org/fontlist?family'
	).json) as FontlistResponse;

	return Object.entries(response).map(([id, family]) => ({ id, family }));
};

export class SearchModal extends SuggestModal<Font> {
	private plugin: FontsourcePlugin;
	// Cache the list of fonts to avoid fetching it multiple times
	private listCache: Font[];

	constructor(app: App, plugin: FontsourcePlugin) {
		super(app);
		this.plugin = plugin;

		this.inputEl.placeholder = 'Select to import a font...';
		this.emptyStateText = 'No fonts found.';
		this.limit = 2000;
	}

	// Trigger refresh on import
	onImported(): void {}

	private filterFonts(query: string): Font[] {
		return this.listCache.filter((font) =>
			font.family.toLowerCase().includes(query.toLowerCase())
		);
	}

	async getSuggestions(query: string): Promise<Font[]> {
		if (!this.listCache) {
			const fonts = await getFontlist();
			this.listCache = fonts;
			return this.filterFonts(query);
		}

		return this.filterFonts(query);
	}

	renderSuggestion(item: Font, el: HTMLElement): void {
		el.setText(item.family);
	}

	async onChooseSuggestion(font: Font, _evt: MouseEvent | KeyboardEvent) {
		new Notice(`Importing ${font.family}...`);

		try {
			const metadata = await importFont(font.id, this.plugin);

			// Add the font to the settings
			const fonts = this.plugin.settings.fonts
				.filter((f) => f.id !== metadata.id)
				.concat(metadata);
			this.plugin.settings.fonts = fonts;
			await this.plugin.saveSettings();

			this.onImported();
			new Notice(`Imported ${font.family}.`);
		} catch (error) {
			console.error('Error importing font:', error);
			new Notice(`Unable to import ${font.family}.`);
		}
	}
}
