import memfs, { vol } from 'memfs';

import { updateSkubaConfigVersion } from './update';

jest.mock('fs', () => memfs);

afterEach(() => {
  vol.reset();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.resetAllMocks();
});

it('should create a new file', async () => {
  vol.fromJSON({});
  await updateSkubaConfigVersion({
    version: '12.3.8',
    path: '/skuba-place/skuba.config.ts',
  });
  expect(vol.toJSON()).toEqual({
    '/skuba-place/skuba.config.ts': `import type { SkubaConfig } from 'skuba/config';

// This is the version of skuba that patches were last applied at.
// Skuba will automatically update this version when patches are applied, do not change it manually.
export const lastPatchedVersion = '12.3.8';

const config: SkubaConfig = {};

export default config;
`,
  });
});

it('should add the version to a file with an import and default export', async () => {
  vol.fromJSON({
    '/skuba.config.ts': `import type { SkubaConfig } from 'skuba/config';

export default { } satisfies SkubaConfig;`,
  });

  await updateSkubaConfigVersion({
    version: '12.3.8',
    path: '/skuba.config.ts',
  });

  expect(vol.toJSON()).toEqual({
    '/skuba.config.ts': `import type { SkubaConfig } from 'skuba/config';

// This is the version of skuba that patches were last applied at.
// Skuba will automatically update this version when patches are applied, do not change it manually.
export const lastPatchedVersion = '12.3.8';

export default { } satisfies SkubaConfig;`,
  });
});

it('should add the version to a file with an import and variable + default export', async () => {
  vol.fromJSON({
    '/skuba.config.ts': `import type { SkubaConfig } from 'skuba/config';

const config: SkubaConfig = {};

export default config;`,
  });

  await updateSkubaConfigVersion({
    version: '12.3.8',
    path: '/skuba.config.ts',
  });

  expect(vol.toJSON()).toEqual({
    '/skuba.config.ts': `import type { SkubaConfig } from 'skuba/config';

// This is the version of skuba that patches were last applied at.
// Skuba will automatically update this version when patches are applied, do not change it manually.
export const lastPatchedVersion = '12.3.8';

const config: SkubaConfig = {};

export default config;`,
  });
});

it('should add the version to a file with no import and default export', async () => {
  vol.fromJSON({
    '/skuba.config.ts': `export default {};`,
  });

  await updateSkubaConfigVersion({
    version: '12.3.8',
    path: '/skuba.config.ts',
  });

  expect(vol.toJSON()).toEqual({
    '/skuba.config.ts': `// This is the version of skuba that patches were last applied at.
// Skuba will automatically update this version when patches are applied, do not change it manually.
export const lastPatchedVersion = '12.3.8';

export default {};`,
  });
});

it('should add the version to a file with no import and variable + default export', async () => {
  vol.fromJSON({
    '/skuba.config.ts': `const config = {};

export default config;`,
  });

  await updateSkubaConfigVersion({
    version: '12.3.8',
    path: '/skuba.config.ts',
  });

  expect(vol.toJSON()).toEqual({
    '/skuba.config.ts': `// This is the version of skuba that patches were last applied at.
// Skuba will automatically update this version when patches are applied, do not change it manually.
export const lastPatchedVersion = '12.3.8';

const config = {};

export default config;`,
  });
});

it('should add the version at the top if not finding a better spot', async () => {
  vol.fromJSON({
    '/skuba.config.ts': `import type { SkubaConfig } from 'skuba/config';
// random junk`,
  });

  await updateSkubaConfigVersion({
    version: '12.3.8',
    path: '/skuba.config.ts',
  });

  expect(vol.toJSON()).toEqual({
    '/skuba.config.ts': `// This is the version of skuba that patches were last applied at.
// Skuba will automatically update this version when patches are applied, do not change it manually.
export const lastPatchedVersion = '12.3.8';

import type { SkubaConfig } from 'skuba/config';
// random junk`,
  });
});

it('should replace a version', async () => {
  vol.fromJSON({
    '/skuba.config.ts': `import type { SkubaConfig } from 'skuba/config';

// This is the version of skuba that patches were last applied at.
// blah blah blah
export const lastPatchedVersion = '1.2.3';

const config: SkubaConfig = {};

export default config;`,
  });

  await updateSkubaConfigVersion({
    version: '12.3.8',
    path: '/skuba.config.ts',
  });

  expect(vol.toJSON()).toEqual({
    '/skuba.config.ts': `import type { SkubaConfig } from 'skuba/config';

// This is the version of skuba that patches were last applied at.
// blah blah blah
export const lastPatchedVersion = '12.3.8';

const config: SkubaConfig = {};

export default config;`,
  });
});

it('should work with double quotes', async () => {
  vol.fromJSON({
    '/skuba.config.ts': `import type { SkubaConfig } from 'skuba/config';

// This is the version of skuba that patches were last applied at.
// blah blah blah
export const lastPatchedVersion = "1.2.3";

const config: SkubaConfig = {};

export default config;`,
  });

  await updateSkubaConfigVersion({
    version: '12.3.8',
    path: '/skuba.config.ts',
  });

  expect(vol.toJSON()).toEqual({
    '/skuba.config.ts': `import type { SkubaConfig } from 'skuba/config';

// This is the version of skuba that patches were last applied at.
// blah blah blah
export const lastPatchedVersion = "12.3.8";

const config: SkubaConfig = {};

export default config;`,
  });
});

it('should work if the current version has wrapped', async () => {
  vol.fromJSON({
    '/skuba.config.ts': `import type { SkubaConfig } from 'skuba/config';

export const lastPatchedVersion    =
    '1.2.3'  // blah blah blah
;

export default {} satisfies SkubaConfig;`,
  });

  await updateSkubaConfigVersion({
    version: '12.3.8',
    path: '/skuba.config.ts',
  });

  expect(vol.toJSON()).toEqual({
    '/skuba.config.ts': `import type { SkubaConfig } from 'skuba/config';

export const lastPatchedVersion = '12.3.8'  // blah blah blah
;

export default {} satisfies SkubaConfig;`,
  });
});
