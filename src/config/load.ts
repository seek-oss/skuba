import path from 'path';

import { register } from 'esbuild-register/dist/node';

import { type SkubaConfig, skubaConfigSchema } from './types';

import { getDestinationManifest } from 'cli/configure/analysis/package';
import { log } from 'utils/logging';

const CONFIG_FILENAME = 'skuba.config.ts';

export const loadSkubaConfig = async (cwd?: string): Promise<SkubaConfig> => {
  // FIXME: remove underlying `process.exit`
  const manifest = await getDestinationManifest({ cwd });

  const configPath = path.join(manifest.path, '..', CONFIG_FILENAME);

  const esbuildRegistration = register({ target: 'node16' });

  try {
    const rawConfig: unknown = await import(configPath);

    return skubaConfigSchema.parse(rawConfig);
  } catch (err) {
    log.warn(`Failed to load ${log.bold(configPath)}.`);
    log.subtle(err);

    return {};
  } finally {
    esbuildRegistration.unregister();
  }
};
