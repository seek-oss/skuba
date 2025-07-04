import path from 'path';
import { inspect } from 'util';

import fs from 'fs-extra';
import * as fleece from 'golden-fleece';
import { z } from 'zod';

import * as Git from '../../../api/git/index.js';
import { log } from '../../../utils/logging.js';
import { createDestinationFileReader } from '../../configure/analysis/project.js';
import { RENOVATE_CONFIG_FILENAMES } from '../../configure/modules/renovate.js';
import { formatPrettier } from '../../configure/processing/prettier.js';

import type { PatchFunction, PatchReturnType } from './upgrade/index.js';

const EXISTING_REPO_PRESET_REGEX = /(github|local)>(seek-jobs|seekasia)\//;

type RenovateFiletype = 'json' | 'json5';

type RenovatePreset =
  | 'local>seekasia/renovate-config'
  | 'local>seek-jobs/renovate-config';

const renovateConfigSchema = z.object({
  extends: z.array(z.string()),
});

const ownerToRenovatePreset = (owner: string): RenovatePreset | undefined => {
  const lowercaseOwner = owner.toLowerCase();

  switch (lowercaseOwner) {
    case 'seekasia':
      return 'local>seekasia/renovate-config';

    case 'seek-jobs':
      return 'local>seek-jobs/renovate-config';

    default:
      return;
  }
};

type PatchFile = (props: {
  filepath: string;
  input: string;
  presetToAdd: RenovatePreset;
}) => Promise<void>;

const patchJson: PatchFile = async ({ filepath, input, presetToAdd }) => {
  const json: unknown = JSON.parse(input);

  const config = renovateConfigSchema.safeParse(json);

  if (!config.success) {
    return;
  }

  config.data.extends.unshift(presetToAdd);

  await fs.promises.writeFile(
    filepath,
    await formatPrettier(JSON.stringify(config.data), { parser: 'json' }),
  );

  return;
};

const patchJson5: PatchFile = async ({ filepath, input, presetToAdd }) => {
  const json: unknown = fleece.evaluate(input);

  const config = renovateConfigSchema.safeParse(json);

  if (!config.success) {
    return;
  }

  config.data.extends.unshift(presetToAdd);

  await fs.promises.writeFile(
    filepath,
    await formatPrettier(fleece.patch(input, config.data), { parser: 'json5' }),
  );

  return;
};

const patchByFiletype: Record<RenovateFiletype, PatchFile> = {
  json: patchJson,
  json5: patchJson5,
};

const patchRenovateConfig = async (
  mode: 'format' | 'lint',
  dir: string,
): Promise<PatchReturnType> => {
  const readFile = createDestinationFileReader(dir);

  const { owner } = await Git.getOwnerAndRepo({ dir });

  const presetToAdd = ownerToRenovatePreset(owner);

  if (!presetToAdd) {
    return {
      result: 'skip',
      reason: 'owner does not map to a SEEK preset',
    };
  }

  const maybeConfigs = await Promise.all(
    RENOVATE_CONFIG_FILENAMES.map(async (filepath) => ({
      input: await readFile(filepath),
      filepath,
    })),
  );

  const config = maybeConfigs.find((maybeConfig) => Boolean(maybeConfig.input));
  if (!config?.input) {
    return { result: 'skip', reason: 'no config found' };
  }

  if (
    // The file appears to mention the baseline preset for the configured Git
    // owner. This is a naive check for simplicity.
    config.input.includes(presetToAdd) ||
    // Ignore any renovate configuration which already extends a SEEK-Jobs or seekasia config
    EXISTING_REPO_PRESET_REGEX.exec(config.input)
  ) {
    return {
      result: 'skip',
      reason: 'config already has a SEEK preset',
    };
  }

  if (mode === 'lint') {
    return { result: 'apply' };
  }

  const filetype: RenovateFiletype = config.filepath
    .toLowerCase()
    .endsWith('.json5')
    ? 'json5'
    : 'json';

  const patchFile = patchByFiletype[filetype];

  await patchFile({
    filepath: path.resolve(dir, config.filepath),
    input: config.input,
    presetToAdd,
  });

  return { result: 'apply' };
};

export const tryPatchRenovateConfig = (async ({
  mode,
  dir = process.cwd(),
}) => {
  try {
    // In a monorepo we may be invoked within a subdirectory, but we are working
    // with Renovate config that should be relative to the repository root.
    const gitRoot = await Git.findRoot({ dir });
    if (!gitRoot) {
      return { result: 'skip', reason: 'no Git root found' };
    }

    return await patchRenovateConfig(mode, gitRoot);
  } catch (err) {
    log.warn('Failed to patch Renovate config.');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
}) satisfies PatchFunction;
