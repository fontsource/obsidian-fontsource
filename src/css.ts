import { type FontObject, generateFontFace } from '@fontsource-utils/generate';
import type { FontMetadata } from './types';

const generateCss = (metadata: FontMetadata): string => {
	let css = '';

	// Generate font-face rules
	if (metadata.variable) {
		for (const style of metadata.styles) {
			for (const subset of Object.keys(metadata.unicodeRange)) {
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
				for (const subset of Object.keys(metadata.unicodeRange)) {
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
