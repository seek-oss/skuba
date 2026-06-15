import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { type ModuleFormat, type OutputOptions, rolldown } from 'rolldown';

import { BUNDLE_META_FILENAME, isEsmFormat, isRecord } from '../util.js';

const [configPath, entry, outputDir] = process.argv.slice(2, 5);

if (!configPath || !entry || !outputDir) {
  throw new Error('Expected arguments: <configPath> <entry> <outputDir>');
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  isRecord(value) ? value : undefined;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const mod: unknown = await import(pathToFileURL(configPath).href);
const userConfig = asRecord(asRecord(mod)?.default);

if (!userConfig) {
  throw new Error(
    `Config file must export a default config object: ${configPath}`,
  );
}

const rawOutput = userConfig.output;

if (Array.isArray(rawOutput) && rawOutput.length !== 1) {
  const detail =
    rawOutput.length === 0
      ? 'the `output` array is empty'
      : `the \`output\` array contains ${rawOutput.length} entries`;
  throw new Error(
    `\`output\` must contain exactly one entry but ${detail}: NodejsFunction emits a single index.js/index.mjs handler.`,
  );
}

const baseRaw: Record<string, unknown> =
  asRecord(Array.isArray(rawOutput) ? rawOutput[0] : rawOutput) ?? {};

if (baseRaw.preserveModules) {
  throw new Error(
    '`output.preserveModules` is not supported: NodejsFunction emits a single index.js/index.mjs handler.',
  );
}

if (baseRaw.entryFileNames !== undefined) {
  throw new Error(
    '`output.entryFileNames` is not supported: NodejsFunction names the handler index.js/index.mjs itself.',
  );
}

if (userConfig.input !== undefined) {
  throw new Error(
    '`input` is not supported: NodejsFunction sets the bundle entry itself.',
  );
}

const format = asString(baseRaw.format) ?? 'es';

const { file: _file, ...baseRest } = baseRaw;

const { output: _output, ...userConfigRest } = userConfig;

const inputOptions = {
  ...userConfigRest,
  input: entry,
};

const outputOptions: OutputOptions = {
  ...baseRest,
  format: format as ModuleFormat,
  dir: outputDir,
  entryFileNames: isEsmFormat(format) ? 'index.mjs' : 'index.js',
};

const bundle = await rolldown(inputOptions);

try {
  await bundle.write(outputOptions);
} finally {
  await bundle.close();
}

writeFileSync(
  join(outputDir, BUNDLE_META_FILENAME),
  JSON.stringify({ format }),
);
