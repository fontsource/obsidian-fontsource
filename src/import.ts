import { arrayBufferToBase64, requestUrl } from 'obsidian';
import type { FontMetadata, SettingsMetadata } from './types';
import { generateCss } from './css';
import type FontsourcePlugin from './main';
import PQueue from 'p-queue';

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
		subsets: metadata.subsets,
		styles: metadata.styles,
		weights: metadata.weights,
		variable,
		base64: {},
		unicodeRange: metadata.unicodeRange,
	};

	return font;
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

// Make downloads concurrent for better performance
const queue = new PQueue({ concurrency: 12 });

const downloadFileToBase64 = async (url: string): Promise<string> => {
	const response = await requestUrl(url).arrayBuffer;
	return arrayBufferToBase64(response);
};

const populateBase64 = async (
	metadata: FontMetadata
): Promise<FontMetadata> => {
	let subsets = Object.keys(metadata.unicodeRange);
	if (subsets.length === 0) {
		subsets = metadata.subsets;
	}

	// Generate a download key based on variable or non-variable fonts
	const generateKey = (oldSubset: string, style: string, weight?: number) => {
		// Subset may have square brackets if a unicode key
		const subset = oldSubset.replace(/\[|\]/g, '');

		if (metadata.variable) {
			const axesKey = getAxes(metadata.variable);
			return `${subset}-${axesKey}-${style}`;
		}

		return `${subset}-${weight}-${style}`;
	};

	// Wrap all queued downloads into a promise that updates the base64 map
	// when resolved
	const promises = [];

	for (const style of metadata.styles) {
		if (metadata.variable) {
			for (const subset of subsets) {
				const key = generateKey(subset, style);
				const url = `https://cdn.jsdelivr.net/fontsource/fonts/${metadata.id}:vf@latest/${key}.woff2`;
				promises.push(
					queue.add(() =>
						downloadFileToBase64(url).then((base64) => {
							metadata.base64[`${subset}-${style}`] = base64;
						})
					)
				);
			}
		} else {
			for (const weight of metadata.weights) {
				for (const subset of subsets) {
					const key = generateKey(subset, style, weight);
					const url = `https://cdn.jsdelivr.net/fontsource/fonts/${metadata.id}@latest/${key}.woff2`;
					promises.push(
						queue.add(() =>
							downloadFileToBase64(url).then((base64) => {
								metadata.base64[key] = base64;
							})
						)
					);
				}
			}
		}
	}

	await Promise.all(promises);

	return metadata;
};

queue.on('error', () => {
	queue.clear();
});

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
		subsets: metadata.subsets,
		styles: metadata.styles,
		weights: metadata.weights,
		variable: metadata.variable,
	};
};

export { importFont };
