import {
	type App,
	PluginSettingTab,
	Setting,
	type ButtonComponent,
	Notice,
} from 'obsidian';
import type FontsourcePlugin from 'src/main';
import { SearchModal } from './modal';

export default class FontsourceSettingsTab extends PluginSettingTab {
	constructor(app: App, private plugin: FontsourcePlugin) {
		super(app, plugin);
	}

	display(): void {
		this.containerEl.empty();

		new Setting(this.containerEl)
			.setName('Select Fonts')
			.setDesc('Add a font from the Fontsource directory.')
			.addButton((button: ButtonComponent) => {
				button.setButtonText('+');
				button.onClick(() => {
					const modal = new SearchModal(this.app, this.plugin);
					modal.onImported = () => {
						this.display(); // Refresh
					};
					modal.open();
				});
			});

		this.containerEl.createEl('h3', { text: 'Imported Fonts' });

		// Display all imported fonts
		const fonts = this.plugin.settings.fonts;
		for (const font of fonts) {
			new Setting(this.containerEl)
				.setName(font.family)
				.addButton((button: ButtonComponent) => {
					button.setButtonText('Remove');
					button.onClick(async () => {
						// Delete CSS file from Vault
						const vault = this.plugin.app.vault;
						try {
							await vault.adapter.remove(
								`${vault.configDir}/fonts/${font.id}.css`
							);
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
