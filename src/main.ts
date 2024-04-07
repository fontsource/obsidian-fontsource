import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import FontsourceSettingsTab from './settings';

interface PluginSettings {
	fonts: string[];
}

const DEFAULT_SETTINGS: PluginSettings = {
	fonts: [],
};

export default class FontsourcePlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new FontsourceSettingsTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
