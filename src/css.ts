import { type FontObject, generateFontFace } from '@fontsource-utils/generate';
import type { FontMetadata } from './types';

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
					};

					css += generateFontFace(font);
				}
			}
		}
	}

	return css;
};

export { generateCss };
