import type { SkubaConfig } from './config';

// This is the version of skuba that patches were last applied at.
// Skuba will automatically update this version when patches are applied, do not change it manually.
export const lastPatchedVersion = '10.1.0';

const config: SkubaConfig = {
  buildTool: 'esbuild',
  entryPoint: 'src/index.ts',
  projectType: 'package',
};

export default config;
