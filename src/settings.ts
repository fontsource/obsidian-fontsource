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
import { applyCss, removeCss } from './css';

export default class FontsourceSettingsTab extends PluginSettingTab {
	constructor(app: App, private plugin: FontsourcePlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

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

		// Select where to apply imported fonts
		new Setting(containerEl)
			.setName('Interface font')
			.setDesc('Set base font for all of Obsidian.')
			.addButton((button: ButtonComponent) => {
				button.setButtonText('Manage');
				button.onClick(() => {
					new SelectModal(this.app, this.plugin, 'interface', () =>
						this.display()
					).open();
				});
			});

		new Setting(containerEl)
			.setName('Text font')
			.setDesc('Set font for editing and reading views.')
			.addButton((button: ButtonComponent) => {
				button.setButtonText('Manage');
				button.onClick(() => {
					new SelectModal(this.app, this.plugin, 'text', () =>
						this.display()
					).open();
				});
			});

		new Setting(containerEl)
			.setName('Monospace font')
			.setDesc('Set font for places like code blocks and frontmatter.')
			.addButton((button: ButtonComponent) => {
				button.setButtonText('Manage');
				button.onClick(() => {
					new SelectModal(this.app, this.plugin, 'monospace', () =>
						this.display()
					).open();
				});
			});

		containerEl.createEl('h3', { text: 'Imported Fonts' });

		// Display all imported fonts in alphabetical order
		const fonts = this.plugin.settings.fonts.sort((a, b) =>
			a.family.localeCompare(b.family)
		);
		for (const font of fonts) {
			// Create description fragment
			const desc = new DocumentFragment();
			desc.createEl('p', {
				text: `Weights: ${font.weights.join(', ')}`,
			}).style.lineHeight = '0.4';
			desc.createEl('p', {
				text: `Styles: ${font.styles.join(', ')}`,
			}).style.lineHeight = '0.4';
			desc.createEl('p', {
				text: `Subsets: ${font.subsets.join(', ')}`,
			}).style.lineHeight = '0.4';

			new Setting(containerEl)
				.setName(font.family)
				.setDesc(desc)
				.addToggle((toggle: ToggleComponent) => {
					toggle.setValue(font.isActive).onChange((value) => {
						if (value) {
							applyCss(font.id, this.plugin);
							font.isActive = true;
						} else {
							removeCss(font.id);
							font.isActive = false;
						}

						this.plugin.saveSettings();
					});
				})
				.addButton((button: ButtonComponent) => {
					button.setIcon('trash-2');
					button.setTooltip('Remove font');
					button.onClick(async () => {
						const vault = this.plugin.app.vault;
						try {
							// Delete CSS file from Vault
							await vault.adapter.remove(
								`${vault.configDir}/fonts/${font.id}.css`
							);
							// Unload CSS from DOM
							removeCss(font.id);

							// If successful, remove from settings
							this.plugin.settings.fonts = this.plugin.settings.fonts.filter(
								(f) => f.id !== font.id
							);
							this.plugin.saveSettings();
							new Notice(`Deleted ${font.family}.`);
							this.display(); // Refresh
						} catch (error) {
							console.error('Error deleting font:', error);
							new Notice(`Unable to delete ${font.id}.css from Vault.`);
						}
					});
				});
		}
	}
}
