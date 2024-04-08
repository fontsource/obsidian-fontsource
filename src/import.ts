import { arrayBufferToBase64, requestUrl } from 'obsidian';
import type { FontMetadata, SettingsMetadata } from './types';
import { generateCss } from './css';
import type FontsourcePlugin from './main';

const fetchMetadata = async (id: string): Promise<FontMetadata> => {
	const metadata = await requestUrl(`https://api.fontsource.org/v1/fonts/${id}`)
		.json;

	let variable: FontMetadata['variable'];
	if (metadata.variable) {
		const variableResponse = await requestUrl(
			`https://api.fontsource.org/v1/variable/${id}`
		).json;
		variable = variableResponse.axes;
	}

	const font: FontMetadata = {
		id: metadata.id,
		family: metadata.family,
		styles: metadata.styles,
		weights: metadata.weights,
		variable,
		base64: {},
		unicodeRange: metadata.unicodeRange,
	};

	return font;
};

const downloadFileToBase64 = async (url: string): Promise<string> => {
	console.log('Downloading:', url);
	const response = await requestUrl(url).arrayBuffer;
	console.log('Downloaded:', url);
	return arrayBufferToBase64(response);
};

// Return the axes with the most available options
const getAxes = (variable: NonNullable<FontMetadata['variable']>): string => {
	const axes = Object.keys(variable).filter((axis) => axis !== 'ital');

	if (axes.length === 1 && variable?.wght) {
		return 'wght';
	}

	if (axes.length === 2 && variable?.wght) {
		return axes.find((axis) => axis !== 'wght') ?? 'wght';
	}

	const isStandard = axes.every((axis) =>
		['wght', 'wdth', 'slnt', 'opsz'].includes(axis)
	);
	if (isStandard) {
		return 'standard';
	}

	return 'full';
};

const populateBase64 = async (
	metadata: FontMetadata
): Promise<FontMetadata> => {
	if (metadata.variable) {
		const axesKey = getAxes(metadata.variable);

		for (const style of metadata.styles) {
			for (const subset of Object.keys(metadata.unicodeRange)) {
				const key = `${subset}-${axesKey}-${style}`;
				const url = `https://cdn.jsdelivr.net/fontsource/fonts/${metadata.id}:vf@latest/${key}.woff2`;
				const base64 = await downloadFileToBase64(url);
				metadata.base64[`${subset}-${style}`] = base64;
			}
		}
	} else {
		for (const style of metadata.styles) {
			for (const weight of metadata.weights) {
				for (const subset of Object.keys(metadata.unicodeRange)) {
					const key = `${subset}-${weight}-${style}`;
					const url = `https://cdn.jsdelivr.net/fontsource/fonts/${metadata.id}@latest/${key}.woff2`;
					const base64 = await downloadFileToBase64(url);
					metadata.base64[`${subset}-${weight}-${style}`] = base64;
				}
			}
		}
	}

	return metadata;
};

const importFont = async (
	id: string,
	plugin: FontsourcePlugin
): Promise<SettingsMetadata> => {
	// Fetch metadata
	const metadata = await fetchMetadata(id);

	// Download font files
	const metadataWithBase64 = await populateBase64(metadata);

	// Generate CSS
	const css = generateCss(metadataWithBase64);

	// Save CSS
	const vault = plugin.app.vault;
	const path = `${vault.configDir}/fonts/${id}.css`;
	await vault.adapter.mkdir(`${vault.configDir}/fonts`);
	await vault.adapter.write(path, css);

	return {
		id: metadata.id,
		family: metadata.family,
		styles: metadata.styles,
		weights: metadata.weights,
		variable: metadata.variable,
	};
};

export { importFont };
