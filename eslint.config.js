import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig(
	globalIgnores([
		'esbuild.config.mjs',
		'eslint.config.js',
		'main.js',
		'pnpm-lock.yaml',
		'test-vault/',
		'version-bump.mjs',
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		files: ['**/*.test.ts'],
		rules: {
			'@typescript-eslint/no-floating-promises': 'off',
			'obsidianmd/no-nodejs-modules': 'off',
		},
	},
);
