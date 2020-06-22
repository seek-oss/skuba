import fs from 'fs-extra';

const skubaPresetsFilePath = process.env.SKUBA_PRESETS_PATH;

type Presets = Record<string, string>;

const handleFileError = (err: Error) => {
  // TODO: handle preset errors more better
  // eslint-disable-next-line no-console
  console.error(err);

  return Promise.resolve();
};

export const getPresets = async (): Promise<Presets | undefined> => {
  if (!skubaPresetsFilePath) {
    return undefined;
  }

  try {
    const presetsData = await fs.readFile(skubaPresetsFilePath, 'utf8');

    if (!presetsData) {
      await handleFileError(new Error('File did not contain presets values'));
    }

    // TODO validate JSON types
    const presets = JSON.parse(presetsData) as unknown;
    return presets as Presets;
  } catch (err) {
    await handleFileError(err);
    return undefined;
  }
};
