import {
	type App,
	Notice,
	requestUrl,
	SuggestModal,
	Modal,
	Setting,
} from 'obsidian';
import type FontsourcePlugin from './main';
import { importFont } from './import';
import type { FontType, SettingsPrecedence } from './types';

interface Font {
	id: string;
	family: string;
}

const getFontlist = async (): Promise<Font[]> => {
	const response = (await requestUrl(
		'https://api.fontsource.org/fontlist?family',
	)).json as Record<string, string>;

	return Object.entries(response).map(([id, family]) => ({ id, family }));
};

export class SearchModal extends SuggestModal<Font> {
	// Cache the list of fonts to avoid fetching it multiple times
	private listCache?: Font[];

	constructor(
		app: App,
		private plugin: FontsourcePlugin,
		private refresh: () => void,
	) {
		super(app);

		this.inputEl.placeholder = 'Select to import a font...';
		this.emptyStateText = 'No fonts found.';
		this.limit = 2500;
	}

	private filterFonts(query: string): Font[] {
		return (this.listCache ?? []).filter((font) =>
			font.family.toLowerCase().includes(query.toLowerCase()),
		);
	}

	async getSuggestions(query: string): Promise<Font[]> {
		this.listCache ??= await getFontlist();
		return this.filterFonts(query);
	}

	renderSuggestion(item: Font, el: HTMLElement): void {
		el.setText(item.family);
	}

	onChooseSuggestion(font: Font, _evt: MouseEvent | KeyboardEvent): void {
		void this.importFont(font);
	}

	private async importFont(font: Font): Promise<void> {
		new Notice(`Importing ${font.family}...`);

		try {
			const metadata = await importFont(font.id, this.plugin);

			// Add the font to the settings
			const fonts = this.plugin.settings.fonts
				.filter((f) => f.id !== metadata.id)
				.concat(metadata);
			this.plugin.settings.fonts = fonts;
			await this.plugin.saveSettings();

			this.refresh();
			new Notice(`Imported ${font.family}.`);
		} catch (error) {
			console.error('Error importing font:', error);
			new Notice(`Unable to import ${font.family}.`);
		}
	}
}

export class SearchActiveModal extends SuggestModal<Font> {
	constructor(
		app: App,
		private plugin: FontsourcePlugin,
		private type: FontType,
		private refresh: () => void,
	) {
		super(app);

		this.inputEl.placeholder = 'Select a font...';
		this.emptyStateText = 'No fonts found.';
		this.limit = 2000;
	}

	getSuggestions(query: string): Font[] {
		return this.plugin.settings.fonts.filter(
			(font) =>
				font.family.toLowerCase().includes(query.toLowerCase()) &&
				font.isActive,
		);
	}

	renderSuggestion(item: Font, el: HTMLElement): void {
		el.setText(item.family);
	}

	private addFontToSettings(
		fonts: SettingsPrecedence[],
		font: Font,
	): boolean {
		if (!fonts.some(({ id }) => id === font.id)) {
			fonts.push({
				id: font.id,
				family: font.family,
				precedence: 0,
			});

			return true;
		}

		return false;
	}

	onChooseSuggestion(font: Font, _evt: MouseEvent | KeyboardEvent): void {
		void this.selectFont(font);
	}

	private async selectFont(font: Font): Promise<void> {
		let changed = false;
		switch (this.type) {
			case 'interface':
				changed = this.addFontToSettings(
					this.plugin.settings.interfaceFonts,
					font,
				);
				break;
			case 'text':
				changed = this.addFontToSettings(this.plugin.settings.textFonts, font);
				break;
			case 'monospace':
				changed = this.addFontToSettings(
					this.plugin.settings.monospaceFonts,
					font,
				);
				break;
		}

		try {
			await this.plugin.saveSettings();
			this.refresh();
			this.close();
			if (changed) {
				new Notice(`Selected ${font.family}.`);
			} else {
				new Notice(`${font.family} is already selected.`);
			}
		} catch (error) {
			console.error('Unable to save selected font:', error);
			new Notice(`Unable to select ${font.family}.`);
		}
	}
}

export class SelectModal extends Modal {
	constructor(
		app: App,
		private plugin: FontsourcePlugin,
		private type: FontType,
		private refresh: () => void,
	) {
		super(app);
	}

	rerender(): void {
		this.refresh();
		this.contentEl.empty();
		this.onOpen();
	}

	onOpen(): void {
		const { contentEl } = this;
		// Make first letter uppercase
		const typeTitle = this.type.charAt(0).toUpperCase() + this.type.slice(1);
		contentEl.createEl('h1', { text: `${typeTitle} font` });

		// Add a font to type
		new Setting(contentEl)
			.setName('Add font')
			.setDesc(
				'To support additional languages, you can select multiple fonts in order of precedence.',
			)
			.addButton((button) => {
				button.setIcon('plus');
				button.setTooltip('Select font');
				button.onClick(() => {
					new SearchActiveModal(this.app, this.plugin, this.type, () => {
						this.rerender();
					}).open();
				});
			});

		contentEl.createEl('h3', { text: 'Selected fonts' });

		// Display selected fonts
		let fonts = this.plugin.settings.interfaceFonts;
		switch (this.type) {
			case 'text':
				fonts = this.plugin.settings.textFonts;
				break;
			case 'monospace':
				fonts = this.plugin.settings.monospaceFonts;
				break;
		}

		if (fonts.length === 0) {
			contentEl.createEl('p', { text: 'No fonts selected.' });
		}

		// Sort by precedence, else by family
		fonts.sort((a, b) => {
			if (a.precedence === b.precedence) {
				return a.family.localeCompare(b.family);
			}
			return a.precedence - b.precedence;
		});
		for (const font of fonts) {
			new Setting(contentEl)
				.setName(font.family)
				// Number input to set precedence
				.addText((text) => {
					text.setValue(String(font.precedence));
					text.setPlaceholder('Precedence');
					text.onChange(async (value) => {
						if (/^\d+$/.test(value)) {
							font.precedence = Number.parseInt(value, 10);
							// Sort by precedence
							fonts.sort((a, b) => a.precedence - b.precedence);
							await this.plugin.saveSettings();
							this.rerender();
						} else {
							text.setValue('0');
						}
					});
				})
				.addButton((button) => {
					button.setIcon('x');
					button.setTooltip('Remove font');
					button.onClick(async () => {
						const index = fonts.findIndex((f) => f.id === font.id);
						if (index >= 0) {
							fonts.splice(index, 1);
							await this.plugin.saveSettings();
							this.rerender();
						}
					});
				});
		}
	}
}
