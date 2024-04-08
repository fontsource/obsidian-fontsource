import { type FontObject, generateFontFace } from '@fontsource-utils/generate';
import type { FontMetadata, SettingsPrecedence } from './types';
import type FontsourcePlugin from './main';

const generateCss = (metadata: FontMetadata): string => {
	let css = '';

	// Non-Google fonts don't have unicode ranges
	let subsets = Object.keys(metadata.unicodeRange);
	if (subsets.length === 0) {
		subsets = metadata.subsets;
	}

	if (metadata.variable) {
		// Generate font-face rules
		for (const style of metadata.styles) {
			for (const subset of subsets) {
				const font: FontObject = {
					family: metadata.family,
					style,
					weight: 400,
					display: 'auto',
					src: [
						{
							url: `data:font/woff2;base64,${
								metadata.base64[`${subset}-${style}`]
							}`,
							format: 'woff2-variations',
						},
					],
					unicodeRange: metadata.unicodeRange[subset],
					variable: {
						wght: metadata.variable.wght,
						stretch: metadata.variable.stretch,
						slnt: metadata.variable.slnt,
					},
					comment: `${metadata.id}-variable-${style}`,
				};
				css += generateFontFace(font);
			}
		}
	} else {
		for (const style of metadata.styles) {
			for (const weight of metadata.weights) {
				for (const subset of subsets) {
					const font: FontObject = {
						family: metadata.family,
						style,
						display: 'auto',
						weight,
						src: [
							{
								url: `data:font/woff2;base64,${
									metadata.base64[`${subset}-${weight}-${style}`]
								}`,
								format: 'woff2',
							},
						],
						unicodeRange: metadata.unicodeRange[subset],
						comment: `${metadata.id}-${weight}-${style}`,
					};

					css += generateFontFace(font);
				}
			}
		}
	}
	return css;
};

const applyCss = async (id: string, plugin: FontsourcePlugin) => {
	// Check if stylesheet exists in DOM
	const existing = document.getElementById(`fontsource-${id}`);

	// If found, replace with new stylesheet, else append new stylesheet
	const css = await plugin.app.vault.adapter.read(
		`${plugin.app.vault.configDir}/fonts/${id}.css`,
	);
	if (existing) {
		existing.replaceWith(css);
	} else {
		const style = document.createElement('style');
		style.id = `fontsource-${id}`;
		style.textContent = css;
		document.head.appendChild(style);
	}
};

const removeCss = (id: string) => {
	const existing = document.getElementById(`fontsource-${id}`);
	if (existing) {
		existing.remove();
	}
};

// Extract font families into a string for CSS
const extractFontFamilies = (fonts: SettingsPrecedence[]) =>
	fonts
		// Sort by precedence then family name
		.sort((a, b) => {
			if (a.precedence === b.precedence) {
				return a.family.localeCompare(b.family);
			}

			return a.precedence - b.precedence;
		})
		.map((font) => `'${font.family}'`)
		.join(', ');

const updateCssVariables = (plugin: FontsourcePlugin) => {
	const id = 'fontsource-css-variables';
	const { interfaceFonts, textFonts, monospaceFonts } = plugin.settings;

	// Generate CSS variables
	const interfaceFont = extractFontFamilies(interfaceFonts);
	const textFont = extractFontFamilies(textFonts);
	const monospaceFont = extractFontFamilies(monospaceFonts);

	// Generate CSS text
	const cssText = `
		${interfaceFont ? `--font-interface-override: ${interfaceFont};` : ''}
		${textFont ? `--font-text-override: ${textFont};` : ''}
		${textFont ? `--font-print-override: ${textFont};` : ''}
		${monospaceFont ? `--font-monospace-override: ${monospaceFont};` : ''}
	`;

	// Create or update style element
	let style = document.getElementById(id);

	// If CSS variables are empty, remove style element or do not apply
	if (cssText.trim() === '') {
		if (style) {
			style.remove();
		}
		return;
	}

	// Apply variables
	if (!style) {
		style = document.createElement('style');
		style.id = id;
		document.head.appendChild(style);
	}
	style.textContent = `body { ${cssText} }`;
};

export { applyCss, removeCss, generateCss, updateCssVariables };
