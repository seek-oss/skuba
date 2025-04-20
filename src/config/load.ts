import path from 'path';

import fs from 'fs-extra';
import { createJiti } from 'jiti';

import { log } from '../utils/logging';

import { type SkubaConfig, skubaConfigSchema } from './types';

const CONFIG_FILENAME = 'skuba.config.ts';

const jiti = createJiti(__filename);

const skubaConfigCacheForPath: Record<string, Promise<SkubaConfig>> = {};

const findSkubaConfig = async (cwd: string): Promise<string | null> => {
  let currentDir = cwd;

  while (currentDir !== path.dirname(currentDir)) {
    const filePath = path.join(currentDir, CONFIG_FILENAME);
    const pathExists = await fs.pathExists(filePath);

    if (pathExists) {
      return filePath;
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
};

export const loadSkubaConfig = (
  cwd: string = process.cwd(),
): Promise<SkubaConfig> => {
  const load = async (): Promise<SkubaConfig> => {
    const configPath = await findSkubaConfig(cwd);
    if (!configPath) {
      return {};
    }

    try {
      const rawConfig = await jiti.import(configPath);
      return skubaConfigSchema.parse(rawConfig);
    } catch (err) {
      log.warn(`Failed to load ${log.bold(configPath)}.`);
      log.subtle(err);

      return {};
    }
  };

  return (skubaConfigCacheForPath[cwd] ??= load());
};
