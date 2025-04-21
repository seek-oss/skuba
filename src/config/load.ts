import { createJiti } from 'jiti';
import type { z } from 'zod';

import { locateNearestFile } from '../utils/dir';
import { log } from '../utils/logging';

import { skubaConfigDefault, skubaConfigSchema } from './types';

const jiti = createJiti(__filename);

const skubaConfigCacheForPath: Record<string, Promise<LoadedSkubaConfig>> = {};

export type LoadedSkubaConfig = z.output<typeof skubaConfigSchema> & {
  configPath?: string;
  lastPatchedVersion?: string;
};

export const loadSkubaConfig = (
  cwd: string = process.cwd(),
): Promise<LoadedSkubaConfig> => {
  const load = async () => {
    const configPath = await locateNearestFile({
      cwd,
      filename: 'skuba.config.ts',
    });
    if (!configPath) {
      return skubaConfigDefault;
    }

    try {
      const rawConfig: { default: unknown; lastPatchedVersion?: string } =
        await jiti.import(configPath);

      const base = skubaConfigSchema.parse(rawConfig.default);
      return {
        ...base,
        configPath,
        lastPatchedVersion: rawConfig.lastPatchedVersion,
      };
    } catch (err) {
      log.warn(`Failed to load ${log.bold(configPath)}.`);
      log.subtle(err);

      return { ...skubaConfigDefault, configPath };
    }
  };

  return (skubaConfigCacheForPath[cwd] ??= load());
};
