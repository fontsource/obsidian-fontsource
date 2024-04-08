import { Plugin } from 'obsidian';
import FontsourceSettingsTab from './settings';
import type { SettingsMetadata, SettingsPrecedence } from './types';
import { applyCss } from './css';

interface PluginSettings {
	fonts: SettingsMetadata[];
	interfaceFonts: SettingsPrecedence[];
	textFonts: SettingsPrecedence[];
	monospaceFonts: SettingsPrecedence[];
}

const DEFAULT_SETTINGS: PluginSettings = {
	fonts: [],
	interfaceFonts: [],
	textFonts: [],
	monospaceFonts: [],
};

export default class FontsourcePlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new FontsourceSettingsTab(this.app, this));

		// Apply CSS for all active fonts
		for (const font of this.settings.fonts) {
			if (font.isActive) {
				applyCss(font.id, this);
			}
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
