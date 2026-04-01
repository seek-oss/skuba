import { describe, expect, it } from 'vitest';

import { insertImportXConfigFilesOverride } from './addEslintConfigImportXNoDefaultExport.js';

describe('insertImportXConfigFilesOverride', () => {
  it('should append config block before closing of export default array', async () => {
    const input = `import skuba from 'eslint-config-skuba';

export default [
  ...skuba,
  {
    rules: {
      'no-console': 'off',
    },
  },
];
`;

    const expected = `import skuba from 'eslint-config-skuba';

export default [
  ...skuba,
  {
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['*.config.js', '.prettierrc.js', 'vitest.config.ts'],
    rules: {
      'import-x/no-default-export': 'off',
    },
  },
];
`;

    await expect(insertImportXConfigFilesOverride(input)).resolves.toBe(
      expected,
    );
  });

  it('should add trailing comma when last array element omits it', async () => {
    const input = `export default [
  {
    rules: { 'no-console': 'off' },
  }
];
`;

    const out = await insertImportXConfigFilesOverride(input);
    expect(out).toContain("'import-x/no-default-export': 'off'");
    expect(out?.trimEnd().endsWith('];')).toBe(true);
  });

  it('should return null when override is already present', async () => {
    const input = `export default [
  {
    files: ['*.config.js', '.prettierrc.js', 'vitest.config.ts'],
    rules: {
      'import-x/no-default-export': 'off',
    },
  },
];
`;

    await expect(insertImportXConfigFilesOverride(input)).resolves.toBeNull();
  });

  it('should return null when default export is not a literal array', async () => {
    await expect(
      insertImportXConfigFilesOverride(`export default defineConfig([]);`),
    ).resolves.toBeNull();
  });
});
