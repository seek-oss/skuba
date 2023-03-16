/* eslint-disable new-cap */

import { inspect } from 'util';

import fs from 'fs-extra';
import * as fleece from 'golden-fleece';
import * as t from 'runtypes';

import * as Git from '../../api/git';
import { log } from '../../utils/logging';

import { createDestinationFileReader } from './analysis/project';
import { RENOVATE_CONFIG_FILENAMES } from './modules/renovate';
import { formatPrettier } from './processing/prettier';

const RENOVATE_PRESETS = [
  'local>seekasia/renovate-config',
  'local>seek-jobs/renovate-config',
] as const;

type RenovateFiletype = 'json' | 'json5';

type RenovatePreset = (typeof RENOVATE_PRESETS)[number];

const RenovateConfig = t.Record({
  extends: t.Array(t.String),
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
  const config: unknown = JSON.parse(input);

  if (!RenovateConfig.guard(config)) {
    return;
  }

  config.extends.unshift(presetToAdd);

  await fs.promises.writeFile(
    filepath,
    formatPrettier(JSON.stringify(config), { parser: 'json' }),
  );

  return;
};

const patchJson5: PatchFile = async ({ filepath, input, presetToAdd }) => {
  const config: unknown = fleece.evaluate(input);

  if (!RenovateConfig.guard(config)) {
    return;
  }

  config.extends.unshift(presetToAdd);

  await fs.promises.writeFile(
    filepath,
    formatPrettier(fleece.patch(input, config), { parser: 'json5' }),
  );

  return;
};

const patchByFiletype: Record<RenovateFiletype, PatchFile> = {
  json: patchJson,
  json5: patchJson5,
};

const patchRenovateConfig = async () => {
  const dir = process.cwd();

  const readFile = createDestinationFileReader(dir);

  const { owner } = await Git.getOwnerAndRepo({ dir });

  const presetToAdd = ownerToRenovatePreset(owner);

  if (!presetToAdd) {
    // No baseline preset needs to be added for the configured Git owner.
    return;
  }

  const maybeConfigs = await Promise.all(
    RENOVATE_CONFIG_FILENAMES.map(async (filepath) => ({
      input: await readFile(filepath),
      filepath,
    })),
  );

  const config = maybeConfigs.find(
    (
      maybeConfig,
    ): maybeConfig is typeof maybeConfig & {
      input: NonNullable<(typeof maybeConfig)['input']>;
    } => Boolean(maybeConfig.input),
  );

  if (
    // No file was found.
    !config?.input ||
    // The file appears to mention the baseline preset for the configured Git
    // owner. This is a very naive check that we don't want to overcomplicate
    // because it is invoked before each skuba format and lint.
    RENOVATE_PRESETS.some((preset) => config.input.includes(preset))
  ) {
    return;
  }

  const filetype: RenovateFiletype = config.filepath
    .toLowerCase()
    .endsWith('.json5')
    ? 'json5'
    : 'json';

  const patchFile = patchByFiletype[filetype];

  await patchFile({ ...config, presetToAdd });
};

export const tryPatchRenovateConfig = async () => {
  try {
    await patchRenovateConfig();
  } catch (err) {
    log.warn('Failed to patch Renovate config.');
    log.subtle(inspect(err));
  }
};
