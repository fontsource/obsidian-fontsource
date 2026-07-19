import { arrayBufferToBase64, requestUrl } from 'obsidian';
import { asConcur, forEachConcur } from 'lfi';
import limitConcur from 'limit-concur';
import type { FontMetadata, SettingsMetadata, VariableAxes } from './types';
import { generateCss } from './css';
import type FontsourcePlugin from './main';

interface FontMetadataResponse {
	id: string;
	family: string;
	subsets: string[];
	styles: string[];
	weights: number[];
	variable: boolean;
	unicodeRange?: Record<string, string>;
}

interface VariableMetadataResponse {
	axes: VariableAxes;
}

interface Download {
	key: string;
	url: string;
}

const fetchMetadata = async (id: string): Promise<FontMetadata> => {
	const metadata = (
		await requestUrl(`https://api.fontsource.org/v1/fonts/${id}`)
	).json as FontMetadataResponse;

	let variable: FontMetadata['variable'];
	if (metadata.variable) {
		const variableMetadata = (
			await requestUrl(
				`https://api.fontsource.org/v1/variable/${id}`,
			)
		).json as VariableMetadataResponse;
		variable = variableMetadata.axes;
	}

	return {
		id: metadata.id,
		family: metadata.family,
		subsets: metadata.subsets,
		styles: metadata.styles,
		weights: metadata.weights,
		variable,
		base64: {},
		unicodeRange: metadata.unicodeRange ?? {},
	};
};

// Return the axes with the most available options
const getAxes = (variable: NonNullable<FontMetadata['variable']>): string => {
	const axes = Object.entries(variable)
		.filter(([axis, range]) => axis !== 'ital' && range !== undefined)
		.map(([axis]) => axis);

	if (axes.length === 1 && variable.wght) {
		return 'wght';
	}

	if (axes.length === 2 && variable.wght) {
		return axes.find((axis) => axis !== 'wght') ?? 'wght';
	}

	const isStandard = axes.every((axis) =>
		['wght', 'wdth', 'slnt', 'opsz'].includes(axis),
	);
	if (isStandard) {
		return 'standard';
	}

	return 'full';
};

const downloadFont = limitConcur(
	12,
	async (url: string): Promise<string> =>
		arrayBufferToBase64((await requestUrl(url)).arrayBuffer),
);

const populateBase64 = async (
	metadata: FontMetadata,
): Promise<void> => {
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

	const downloads: Download[] = [];

	for (const style of metadata.styles) {
		if (metadata.variable) {
			for (const subset of subsets) {
				const key = generateKey(subset, style);
				const url = `https://cdn.jsdelivr.net/fontsource/fonts/${metadata.id}:vf@latest/${key}.woff2`;
				downloads.push({ key: `${subset}-${style}`, url });
			}
		} else {
			for (const weight of metadata.weights) {
				for (const subset of subsets) {
					const key = generateKey(subset, style, weight);
					const url = `https://cdn.jsdelivr.net/fontsource/fonts/${metadata.id}@latest/${key}.woff2`;
					downloads.push({ key, url });
				}
			}
		}
	}

	let failed = false;
	let failure: unknown;
	await forEachConcur(async ({ key, url }) => {
		try {
			metadata.base64[key] = await downloadFont(url);
		} catch (error) {
			if (!failed) {
				failed = true;
				failure = error;
			}
		}
	}, asConcur(downloads));

	if (failed) {
		throw failure;
	}
};

const importFont = async (
	id: string,
	plugin: FontsourcePlugin,
): Promise<SettingsMetadata> => {
	const metadata = await fetchMetadata(id);
	try {
		await populateBase64(metadata);
	} catch (error) {
		if (
			!metadata.variable ||
			!(error instanceof Error) ||
			!error.message.includes('status 404')
		) {
			throw error;
		}

		// Fontsource can publish variable metadata before the matching CDN asset.
		metadata.variable = undefined;
		metadata.base64 = {};
		await populateBase64(metadata);
	}
	const css = generateCss(metadata);

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
		isActive: false,
	};
};

export { importFont };
