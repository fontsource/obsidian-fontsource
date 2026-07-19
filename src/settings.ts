import {
	type App,
	Notice,
	PluginSettingTab,
	Setting,
} from 'obsidian';
import { applyCss, removeCss, updateCssVariables } from './css';
import type FontsourcePlugin from './main';
import { SearchModal, SelectModal } from './modal';
import type { FontType, SettingsMetadata } from './types';

export default class FontsourceSettingsTab extends PluginSettingTab {
	constructor(
		app: App,
		private plugin: FontsourcePlugin,
	) {
		super(app, plugin);
	}

	private createManageSetting(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		type: FontType,
	): void {
		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addButton((button) => {
				button.setButtonText('Manage');
				button.onClick(() => {
					new SelectModal(this.app, this.plugin, type, () => {
						this.display();
						updateCssVariables(this.plugin);
					}).open();
				});
			});
	}

	private removeFromSettings<T extends { id: string }>(
		settings: T[],
		id: string,
	): T[] {
		return settings.filter((font) => font.id !== id);
	}

	private removeFromAppliedFonts(id: string): void {
		this.plugin.settings.interfaceFonts = this.removeFromSettings(
			this.plugin.settings.interfaceFonts,
			id,
		);
		this.plugin.settings.textFonts = this.removeFromSettings(
			this.plugin.settings.textFonts,
			id,
		);
		this.plugin.settings.monospaceFonts = this.removeFromSettings(
			this.plugin.settings.monospaceFonts,
			id,
		);
		updateCssVariables(this.plugin);
	}

	private async deleteFont(font: SettingsMetadata): Promise<void> {
		const vault = this.plugin.app.vault;
		try {
			await vault.adapter.remove(
				`${vault.configDir}/fonts/${font.id}.css`,
			);
			removeCss(font.id, this.plugin);
			this.plugin.settings.fonts = this.removeFromSettings(
				this.plugin.settings.fonts,
				font.id,
			);
			this.removeFromAppliedFonts(font.id);
			await this.plugin.saveSettings();
			new Notice(`Deleted ${font.family}.`);
			this.display();
		} catch (error) {
			console.error('Error deleting font:', error);
			new Notice(`Unable to delete ${font.id}.css from the vault.`);
		}
	}

	private createFontSetting(
		containerEl: HTMLElement,
		font: SettingsMetadata,
	): void {
		const setting = new Setting(containerEl).setName(font.family);
		setting.descEl.createSpan({
			text: `Weights: ${font.weights.join(', ')}`,
		});
		setting.descEl.createEl('br');
		setting.descEl.createSpan({ text: `Styles: ${font.styles.join(', ')}` });
		setting.descEl.createEl('br');
		setting.descEl.createSpan({ text: `Subsets: ${font.subsets.join(', ')}` });
		let pending = false;
		const setPending = (value: boolean): void => {
			pending = value;
			setting.setDisabled(value);
		};

		setting
			.addToggle((toggle) => {
				toggle.setValue(font.isActive).onChange(async (value) => {
					if (pending) {
						return;
					}
					setPending(true);
					try {
						if (value) {
							await applyCss(font.id, this.plugin);
						} else {
							removeCss(font.id, this.plugin);
							this.removeFromAppliedFonts(font.id);
						}

						font.isActive = value;
						await this.plugin.saveSettings();
					} catch (error) {
						console.error('Unable to update font state:', error);
						toggle.setValue(font.isActive);
						new Notice(`Unable to update ${font.family}.`);
					} finally {
						setPending(false);
					}
				});
			})
			.addButton((button) => {
				button.setIcon('trash-2');
				button.setTooltip('Remove font');
				button.onClick(async () => {
					if (pending) {
						return;
					}
					setPending(true);
					await this.deleteFont(font);
					setPending(false);
				});
			});
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		this.createManageSetting(
			containerEl,
			'Interface font',
			'Set the base font for all of Obsidian.',
			'interface',
		);
		this.createManageSetting(
			containerEl,
			'Text font',
			'Set the font for editing and reading views.',
			'text',
		);
		this.createManageSetting(
			containerEl,
			'Monospace font',
			'Set the font for code blocks and frontmatter.',
			'monospace',
		);

		new Setting(containerEl).setName('Imported fonts').setHeading();
		new Setting(containerEl)
			.setName('Select fonts')
			.setDesc('Import a font.')
			.addButton((button) => {
				button.setIcon('plus');
				button.setTooltip('Import font');
				button.onClick(() => {
					new SearchModal(this.app, this.plugin, () => this.display()).open();
				});
			});

		const fonts = [...this.plugin.settings.fonts].sort((a, b) =>
			a.family.localeCompare(b.family),
		);
		for (const font of fonts) {
			this.createFontSetting(containerEl, font);
		}
	}
}
