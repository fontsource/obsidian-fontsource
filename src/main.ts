import { Plugin } from 'obsidian';
import FontsourceSettingsTab from './settings';
import type { SettingsMetadata, SettingsPrecedence } from './types';
import {
	applyCss,
	clearDocumentCss,
	getWorkspaceDocuments,
	updateCssVariables,
} from './css';

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
	settings!: PluginSettings;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new FontsourceSettingsTab(this.app, this));
		await this.initializeFonts(activeDocument);

		this.registerEvent(
			this.app.workspace.on('window-open', (_workspaceWindow, window) => {
				void this.initializeFonts(window.document).catch((error: unknown) => {
					console.error('Unable to load fonts in popout window:', error);
				});
			}),
		);
	}

	private async initializeFonts(doc?: Document): Promise<void> {
		for (const font of this.settings.fonts) {
			if (font.isActive) {
				try {
					await applyCss(font.id, this, doc);
				} catch (error) {
					console.error(`Unable to load ${font.id}:`, error);
				}
			}
		}
		updateCssVariables(this, doc);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<PluginSettings>,
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	onunload(): void {
		for (const doc of getWorkspaceDocuments(this)) {
			clearDocumentCss(doc);
		}
	}
}
