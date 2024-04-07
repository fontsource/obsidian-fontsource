import {
	type App,
	PluginSettingTab,
	Setting,
	type ButtonComponent,
} from 'obsidian';
import type FontsourcePlugin from 'src/main';
import { SearchModal } from './modal';

export default class FontsourceSettingsTab extends PluginSettingTab {
	constructor(app: App, private plugin: FontsourcePlugin) {
		super(app, plugin);
	}

	display(): void {
		const { app, containerEl, plugin, display } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Select Fonts')
			.setDesc('Add a font from the Fontsource directory.')
			.addButton((button: ButtonComponent) => {
				button.setButtonText('+');
				button.onClick(() => {
					const modal = new SearchModal(app, plugin);
					modal.onImported = () => {
						display(); // Refresh
					};
					modal.open();
				});
			});

		containerEl.createEl('h3', { text: 'Imported Fonts' });

		// Display all imported fonts
		const fonts = plugin.settings.fonts;
		for (const font of fonts) {
			new Setting(containerEl)
				.setName(font)
				.addButton((button: ButtonComponent) => {
					button.setButtonText('Remove');
					button.onClick(() => {
						plugin.settings.fonts = plugin.settings.fonts.filter(
							(f) => f !== font
						);
						plugin.saveSettings();
						display(); // Refresh
					});
				});
		}
	}
}
