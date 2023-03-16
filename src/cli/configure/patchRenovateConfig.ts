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

const renovatePresetSet = new Set<unknown>(RENOVATE_PRESETS);

const RenovateConfig = t.Record({
  extends: t.Array(
    t.String.withConstraint((preset) => !renovatePresetSet.has(preset)),
  ),
});

const ownerToRenovatePreset = (owner: string): RenovatePreset => {
  if (owner.toLowerCase() === 'seekasia') {
    return 'local>seekasia/renovate-config';
  }

  return 'local>seek-jobs/renovate-config';
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

  const seekPresetIndex = config.extends.findIndex(
    (preset) =>
      preset === 'seek' || preset.startsWith('github>seek-oss/rynovate'),
  );

  if (seekPresetIndex === -1) {
    return;
  }

  config.extends.splice(seekPresetIndex, 0, presetToAdd);

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

  const seekPresetIndex = config.extends.findIndex(
    (preset) =>
      preset === 'seek' || preset.startsWith('github>seek-oss/rynovate'),
  );

  if (seekPresetIndex === -1) {
    return;
  }

  config.extends.splice(seekPresetIndex, 0, presetToAdd);

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

  const [{ owner }, ...maybeConfigs] = await Promise.all([
    Git.getOwnerAndRepo({ dir }),

    ...RENOVATE_CONFIG_FILENAMES.map(async (filepath) => ({
      input: await readFile(filepath),
      filepath,
    })),
  ]);

  const config = maybeConfigs.find(
    (
      maybeConfig,
    ): maybeConfig is typeof maybeConfig & {
      input: NonNullable<(typeof maybeConfig)['input']>;
    } => Boolean(maybeConfig.input),
  );

  if (!config?.input) {
    return;
  }

  const filetype: RenovateFiletype = config.filepath
    .toLowerCase()
    .endsWith('.json5')
    ? 'json5'
    : 'json';

  const presetToAdd = ownerToRenovatePreset(owner);

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
