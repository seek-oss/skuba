import { describe, expect, it } from 'vitest';

import {
  hasImportXNoDefaultExportEnabled,
  insertImportXConfigFilesOverride,
} from './addEslintConfigImportXNoDefaultExport.js';

describe('hasImportXNoDefaultExportEnabled', () => {
  it('should be true when rule is set to error or warn in source', () => {
    expect(
      hasImportXNoDefaultExportEnabled(
        `rules: { 'import-x/no-default-export': 'error' }`,
      ),
    ).toBe(true);
    expect(
      hasImportXNoDefaultExportEnabled(
        `rules: { 'import-x/no-default-export': 'warn' }`,
      ),
    ).toBe(true);
    expect(
      hasImportXNoDefaultExportEnabled(
        `rules: { 'import-x/no-default-export': ['error', { foo: 1 }] }`,
      ),
    ).toBe(true);
  });

  it('should be false when only eslint-config-skuba is imported (rule not in file)', () => {
    expect(
      hasImportXNoDefaultExportEnabled(
        `import skuba from 'eslint-config-skuba';\nexport default [...skuba];`,
      ),
    ).toBe(false);
  });

  it('should be false when rule is off or absent', () => {
    expect(
      hasImportXNoDefaultExportEnabled(
        `export default [{ rules: { 'no-console': 'off' } }];`,
      ),
    ).toBe(false);
    expect(
      hasImportXNoDefaultExportEnabled(
        `rules: { 'import-x/no-default-export': 'off' }`,
      ),
    ).toBe(false);
  });
});

describe('insertImportXConfigFilesOverride', () => {
  it('should append config block before closing of export default array', async () => {
    const input = `import skuba from 'eslint-config-skuba';

export default [
  ...skuba,
  {
    rules: {
      'no-console': 'off',
      'import-x/no-default-export': 'error',
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
      'import-x/no-default-export': 'error',
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
    rules: {
      'no-console': 'off',
      'import-x/no-default-export': 'error',
    },
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

  it('should return null when import-x/no-default-export is not enabled and preset is not used', async () => {
    await expect(
      insertImportXConfigFilesOverride(`export default [
  { rules: { 'no-console': 'off' } },
];
`),
    ).resolves.toBeNull();
  });
});
