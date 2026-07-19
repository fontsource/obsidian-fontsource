import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateCss, parseFontFaces } from './css.ts';

describe('parseFontFaces', () => {
	it('round trips generated static and variable font faces', () => {
		const metadata = {
			id: 'test',
			family: 'Test Font',
			subsets: ['latin'],
			styles: ['normal'],
			weights: [400],
			unicodeRange: { latin: 'U+0000-00FF' },
		};
		const [staticFace] = parseFontFaces(
			generateCss({
				...metadata,
				base64: { 'latin-400-normal': 'QUJD' },
			}),
		);
		const [variableFace] = parseFontFaces(
			generateCss({
				...metadata,
				variable: {
					wght: { min: 100, max: 900 },
					wdth: { min: 75, max: 125 },
				},
				base64: { 'latin-normal': 'QUJD' },
			}),
		);

		assert.deepEqual(staticFace, {
			family: 'Test Font',
			source: "url(data:font/woff2;base64,QUJD) format('woff2')",
			descriptors: {
				stretch: undefined,
				style: 'normal',
				unicodeRange: 'U+0000-00FF',
				weight: '400',
			},
		});
		assert.deepEqual(variableFace, {
			family: 'Test Font',
			source:
				"url(data:font/woff2;base64,QUJD) format('woff2-variations')",
			descriptors: {
				stretch: '75% 125%',
				style: 'normal',
				unicodeRange: 'U+0000-00FF',
				weight: '100 900',
			},
		});
	});

	it('rejects invalid cached CSS', () => {
		assert.throws(
			() => parseFontFaces('body {}'),
			/Cached font CSS does not contain any font faces/,
		);
	});
});
