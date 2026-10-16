import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintPluginAstro from 'eslint-plugin-astro';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist/', '.astro/', 'node_modules/']),
  js.configs.recommended,
  tseslint.configs.recommended,
  eslintPluginAstro.configs.recommended,
  // Accessibility rules for .astro templates (backed by eslint-plugin-jsx-a11y-x).
  eslintPluginAstro.configs['jsx-a11y-recommended'],
  {
    // Build scripts and config files run in Node.
    files: ['scripts/**', '*.config.{js,mjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      // Safari/VoiceOver drops list semantics from lists styled with `list-style: none`,
      // so an explicit role="list" on those lists is intentional, not redundant.
      'astro/jsx-a11y/no-redundant-roles': ['error', { ul: ['list'], ol: ['list'] }],
    },
  },
]);
