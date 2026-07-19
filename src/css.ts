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
						stretch: metadata.variable.wdth,
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

interface ParsedFontFace {
	family: string;
	source: string;
	descriptors: FontFaceDescriptors;
}

const loadedFonts = new WeakMap<Document, Map<string, FontFace[]>>();

const getWorkspaceDocuments = (
	plugin: FontsourcePlugin,
	doc?: Document,
): Document[] => {
	if (doc) {
		return [doc];
	}

	const documents = new Set<Document>();
	plugin.app.workspace.iterateAllLeaves((leaf) => {
		documents.add(leaf.view.containerEl.doc);
	});
	return [...documents];
};

const stripCssQuotes = (value: string): string => {
	const trimmed = value.trim();
	if (
		(trimmed.startsWith("'") && trimmed.endsWith("'")) ||
		(trimmed.startsWith('"') && trimmed.endsWith('"'))
	) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
};

const parseDeclarations = (block: string): Map<string, string> => {
	const declarations = new Map<string, string>();
	for (const match of block.matchAll(/^\s*([\w-]+)\s*:\s*(.+);\s*$/gm)) {
		const [, property, value] = match;
		if (property && value) {
			declarations.set(property, value.trim());
		}
	}
	return declarations;
};

export const parseFontFaces = (css: string): ParsedFontFace[] => {
	const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/gi)].map((match) => {
		const declarations = parseDeclarations(match[1] ?? '');
		const family = stripCssQuotes(declarations.get('font-family') ?? '');
		const source = declarations.get('src') ?? '';
		if (!family || !source) {
			throw new Error('Cached font CSS is missing a family or source');
		}

		return {
			family,
			source,
			descriptors: {
				stretch: declarations.get('font-stretch'),
				style: declarations.get('font-style'),
				unicodeRange: declarations.get('unicode-range'),
				weight: declarations.get('font-weight'),
			},
		};
	});

	if (faces.length === 0) {
		throw new Error('Cached font CSS does not contain any font faces');
	}
	return faces;
};

const removeCssFromDocument = (id: string, doc: Document): void => {
	const documentFonts = loadedFonts.get(doc);
	const faces = documentFonts?.get(id);
	if (!documentFonts || !faces) {
		return;
	}

	for (const face of faces) {
		doc.fonts.delete(face);
	}
	documentFonts.delete(id);
};

const applyCssToDocument = (id: string, css: string, doc: Document): void => {
	const FontFaceConstructor = doc.defaultView?.FontFace;
	if (!FontFaceConstructor) {
		throw new Error('This window does not support the FontFace API');
	}
	const faces = parseFontFaces(css).map(
		({ family, source, descriptors }) =>
			new FontFaceConstructor(family, source, descriptors),
	);

	removeCssFromDocument(id, doc);
	for (const face of faces) {
		doc.fonts.add(face);
	}

	let documentFonts = loadedFonts.get(doc);
	if (!documentFonts) {
		documentFonts = new Map();
		loadedFonts.set(doc, documentFonts);
	}
	documentFonts.set(id, faces);
};

const applyCss = async (
	id: string,
	plugin: FontsourcePlugin,
	doc?: Document,
): Promise<void> => {
	const css = await plugin.app.vault.adapter.read(
		`${plugin.app.vault.configDir}/fonts/${id}.css`,
	);
	const documents = getWorkspaceDocuments(plugin, doc);
	for (const document of documents) {
		applyCssToDocument(id, css, document);
	}
};

const removeCss = (
	id: string,
	plugin: FontsourcePlugin,
): void => {
	const documents = getWorkspaceDocuments(plugin);
	for (const document of documents) {
		removeCssFromDocument(id, document);
	}
};

// Extract font families into a string for CSS
const extractFontFamilies = (fonts: SettingsPrecedence[]) =>
	[...fonts]
		// Sort by precedence then family name
		.sort((a, b) => {
			if (a.precedence === b.precedence) {
				return a.family.localeCompare(b.family);
			}

			return a.precedence - b.precedence;
		})
		.map((font) => `'${font.family}'`)
		.join(', ');

const updateCssVariablesForDocument = (
	plugin: FontsourcePlugin,
	doc: Document,
): void => {
	const { interfaceFonts, textFonts, monospaceFonts } = plugin.settings;

	// Generate CSS variables
	const interfaceFont = extractFontFamilies(interfaceFonts);
	const textFont = extractFontFamilies(textFonts);
	const monospaceFont = extractFontFamilies(monospaceFonts);

	for (const [property, value] of [
		['--font-interface-override', interfaceFont],
		['--font-text-override', textFont],
		['--font-print-override', textFont],
		['--font-monospace-override', monospaceFont],
	] as const) {
		if (value) {
			doc.body.style.setProperty(property, value);
		} else {
			doc.body.style.removeProperty(property);
		}
	}
};

const updateCssVariables = (
	plugin: FontsourcePlugin,
	doc?: Document,
): void => {
	const documents = getWorkspaceDocuments(plugin, doc);
	for (const document of documents) {
		updateCssVariablesForDocument(plugin, document);
	}
};

const clearDocumentCss = (doc: Document): void => {
	const documentFonts = loadedFonts.get(doc);
	if (documentFonts) {
		for (const faces of documentFonts.values()) {
			for (const face of faces) {
				doc.fonts.delete(face);
			}
		}
	}
	loadedFonts.delete(doc);

	doc.body.style.removeProperty('--font-interface-override');
	doc.body.style.removeProperty('--font-text-override');
	doc.body.style.removeProperty('--font-print-override');
	doc.body.style.removeProperty('--font-monospace-override');
};

export {
	applyCss,
	clearDocumentCss,
	generateCss,
	getWorkspaceDocuments,
	removeCss,
	updateCssVariables,
};
