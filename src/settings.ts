import {
	type App,
	Notice,
	PluginSettingTab,
	requireApiVersion,
	Setting,
	type SettingDefinition,
	type SettingDefinitionItem,
} from 'obsidian';
import { applyCss, removeCss, updateCssVariables } from './css';
import type FontsourcePlugin from './main';
import { SearchModal, SelectModal } from './modal';
import type { FontType, SettingsMetadata } from './types';

const MANAGE_SETTINGS: {
	name: string;
	desc: string;
	type: FontType;
}[] = [
	{
		name: 'Interface font',
		desc: 'Set the base font for all of Obsidian.',
		type: 'interface',
	},
	{
		name: 'Text font',
		desc: 'Set the font for editing and reading views.',
		type: 'text',
	},
	{
		name: 'Monospace font',
		desc: 'Set the font for code blocks and frontmatter.',
		type: 'monospace',
	},
];

export default class FontsourceSettingsTab extends PluginSettingTab {
	constructor(
		app: App,
		private plugin: FontsourcePlugin,
	) {
		super(app, plugin);
	}

	private renderManageSetting(
		setting: Setting,
		type: FontType,
		refresh: () => void,
	): void {
		setting.addButton((button) => {
			button.setButtonText('Manage');
			button.onClick(() => {
				new SelectModal(this.app, this.plugin, type, () => {
					refresh();
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

	private async deleteFont(
		font: SettingsMetadata,
		refresh: () => void,
	): Promise<void> {
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
			refresh();
		} catch (error) {
			console.error('Error deleting font:', error);
			new Notice(`Unable to delete ${font.id}.css from the vault.`);
		}
	}

	private renderFontSetting(
		setting: Setting,
		font: SettingsMetadata,
		refresh: () => void,
	): void {
		setting.descEl.empty();
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
					await this.deleteFont(font, refresh);
					setPending(false);
				});
			});
	}

	private getSortedFonts(): SettingsMetadata[] {
		return [...this.plugin.settings.fonts].sort((a, b) =>
			a.family.localeCompare(b.family),
		);
	}

	private renderImportSetting(setting: Setting, refresh: () => void): void {
		setting.addButton((button) => {
			button.setIcon('plus');
			button.setTooltip('Import font');
			button.onClick(() => {
				new SearchModal(this.app, this.plugin, refresh).open();
			});
		});
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		const refresh = (): void => {
			if (requireApiVersion('1.13.0')) {
				this.update();
			}
		};
		const importedFonts: SettingDefinition[] = this.getSortedFonts().map(
			(font) => ({
				name: font.family,
				desc: [
					`Weights: ${font.weights.join(', ')}`,
					`Styles: ${font.styles.join(', ')}`,
					`Subsets: ${font.subsets.join(', ')}`,
				].join('; '),
				render: (setting) => {
					this.renderFontSetting(setting, font, refresh);
				},
			}),
		);

		return [
			...MANAGE_SETTINGS.map(
				({ name, desc, type }): SettingDefinition => ({
					name,
					desc,
					render: (setting) => {
						this.renderManageSetting(setting, type, refresh);
					},
				}),
			),
			{
				type: 'group',
				heading: 'Imported fonts',
				items: [
					{
						name: 'Select fonts',
						desc: 'Import a font.',
						render: (setting) => {
							this.renderImportSetting(setting, refresh);
						},
					},
					...importedFonts,
				],
			},
		];
	}

	private renderLegacySettings(): void {
		const { containerEl } = this;
		containerEl.empty();
		const refresh = (): void => this.renderLegacySettings();

		for (const { name, desc, type } of MANAGE_SETTINGS) {
			const setting = new Setting(containerEl).setName(name).setDesc(desc);
			this.renderManageSetting(setting, type, refresh);
		}

		new Setting(containerEl).setName('Imported fonts').setHeading();
		const importSetting = new Setting(containerEl)
			.setName('Select fonts')
			.setDesc('Import a font.');
		this.renderImportSetting(importSetting, refresh);

		for (const font of this.getSortedFonts()) {
			const setting = new Setting(containerEl).setName(font.family);
			this.renderFontSetting(setting, font, refresh);
		}
	}

	display(): void {
		this.renderLegacySettings();
	}
}
