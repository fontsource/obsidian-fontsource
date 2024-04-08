import {
	type App,
	PluginSettingTab,
	Setting,
	type ButtonComponent,
	Notice,
	type ToggleComponent,
} from 'obsidian';
import type FontsourcePlugin from 'src/main';
import { SearchModal, SelectModal } from './modal';
import { applyCss, removeCss, updateCssVariables } from './css';
import type { FontType } from './types';

export default class FontsourceSettingsTab extends PluginSettingTab {
	constructor(
		app: App,
		private plugin: FontsourcePlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Select where to apply imported fonts
		const addFontSetting = (name: string, desc: string, type: FontType) => {
			new Setting(containerEl)
				.setName(name)
				.setDesc(desc)
				.addButton((button: ButtonComponent) => {
					button.setButtonText('Manage');
					button.onClick(() => {
						new SelectModal(this.app, this.plugin, type, () => {
							this.display();
							updateCssVariables(this.plugin);
						}).open();
					});
				});
		};

		addFontSetting(
			'Interface font',
			'Set base font for all of Obsidian.',
			'interface',
		);
		addFontSetting(
			'Text font',
			'Set font for editing and reading views.',
			'text',
		);
		addFontSetting(
			'Monospace font',
			'Set font for places like code blocks and frontmatter.',
			'monospace',
		);

		containerEl.createEl('h3', { text: 'Imported Fonts' });

		// Remove font from settings
		const removeFromSettings = <T extends { id: string }>(
			settings: T[],
			id: string,
		): T[] => {
			return settings.filter((f) => f.id !== id);
		};

		const removeFromAppliedFonts = (id: string): void => {
			this.plugin.settings.interfaceFonts = removeFromSettings(
				this.plugin.settings.interfaceFonts,
				id,
			);
			this.plugin.settings.textFonts = removeFromSettings(
				this.plugin.settings.textFonts,
				id,
			);
			this.plugin.settings.monospaceFonts = removeFromSettings(
				this.plugin.settings.monospaceFonts,
				id,
			);

			updateCssVariables(this.plugin);
		};

		new Setting(containerEl)
			.setName('Select Fonts')
			.setDesc('Add a font from the Fontsource directory.')
			.addButton((button: ButtonComponent) => {
				button.setIcon('plus');
				button.setTooltip('Import font');
				button.onClick(() => {
					new SearchModal(this.app, this.plugin, () => this.display()).open();
				});
			});

		// Display all imported fonts in alphabetical order
		const fonts = this.plugin.settings.fonts.sort((a, b) =>
			a.family.localeCompare(b.family),
		);
		for (const font of fonts) {
			// Create description fragment
			const desc = new DocumentFragment();
			desc.createSpan({
				text: `Weights: ${font.weights.join(', ')}`,
			});
			desc.createEl('br');
			desc.createSpan({
				text: `Styles: ${font.styles.join(', ')}`,
			});
			desc.createEl('br');
			desc.createSpan({
				text: `Subsets: ${font.subsets.join(', ')}`,
			});

			new Setting(containerEl)
				.setName(font.family)
				.setDesc(desc)
				// Toggle to add/remove @font-face fragment to document
				.addToggle((toggle: ToggleComponent) => {
					toggle.setValue(font.isActive).onChange((value) => {
						if (value) {
							applyCss(font.id, this.plugin);
						} else {
							removeCss(font.id);
							removeFromAppliedFonts(font.id);
						}

						font.isActive = value;
						this.plugin.saveSettings();
					});
				})
				.addButton((button: ButtonComponent) => {
					button.setIcon('trash-2');
					button.setTooltip('Remove font');
					button.onClick(async () => {
						const vault = this.plugin.app.vault;
						try {
							await vault.adapter.remove(
								`${vault.configDir}/fonts/${font.id}.css`,
							);
							removeCss(font.id);
							this.plugin.settings.fonts = removeFromSettings(
								this.plugin.settings.fonts,
								font.id,
							);
							removeFromAppliedFonts(font.id);

							this.plugin.saveSettings();
							new Notice(`Deleted ${font.family}.`);
							this.display();
						} catch (error) {
							console.error('Error deleting font:', error);
							new Notice(`Unable to delete ${font.id}.css from Vault.`);
						}
					});
				});
		}
	}
}
