import { pathToFileURL } from 'node:url';

import { type OutputOptions, rolldown } from 'rolldown';

import { isRecord } from '../util.js';

const [configPath, entry, outputDir] = process.argv.slice(2, 5);

if (!configPath || !entry || !outputDir) {
  throw new Error('Expected arguments: <configPath> <entry> <outputDir>');
}

const mod: unknown = await import(pathToFileURL(configPath).href);
const root = isRecord(mod) ? mod.default : undefined;
const userConfig = isRecord(root) ? root : undefined;

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
    `\`output\` must contain exactly one entry but ${detail}: NodejsFunction emits a single index.mjs handler.`,
  );
}

const rawBase: unknown = Array.isArray(rawOutput) ? rawOutput[0] : rawOutput;

if (rawBase !== undefined && !isRecord(rawBase)) {
  throw new Error(
    '`output` must be a configuration object: NodejsFunction emits a single index.mjs handler.',
  );
}

const baseRaw: Record<string, unknown> = isRecord(rawBase) ? rawBase : {};

if (baseRaw.preserveModules) {
  throw new Error(
    '`output.preserveModules` is not supported: NodejsFunction emits a single index.mjs handler.',
  );
}

if (baseRaw.entryFileNames !== undefined) {
  throw new Error(
    '`output.entryFileNames` is not supported: NodejsFunction names the handler index.mjs itself.',
  );
}

if (baseRaw.chunkFileNames !== undefined) {
  throw new Error(
    '`output.chunkFileNames` is not supported: NodejsFunction names the handler index.mjs and lets rolldown name split chunks to avoid collisions.',
  );
}

if (baseRaw.file !== undefined) {
  throw new Error(
    '`output.file` is not supported: NodejsFunction writes index.mjs into the output directory itself.',
  );
}

if (userConfig.input !== undefined) {
  throw new Error(
    '`input` is not supported: NodejsFunction sets the bundle entry itself.',
  );
}

const format = typeof baseRaw.format === 'string' ? baseRaw.format : undefined;

if (format !== undefined && !['es', 'esm', 'module'].includes(format)) {
  throw new Error(
    '`output.format` must be ESM (es/esm/module): NodejsFunction emits an ESM index.mjs handler.',
  );
}

const { output: _output, ...userConfigRest } = userConfig;

const inputOptions = {
  ...userConfigRest,
  input: entry,
};

const outputOptions: OutputOptions = {
  ...baseRaw,
  format: 'es',
  dir: outputDir,
  entryFileNames: 'index.mjs',
};

const bundle = await rolldown(inputOptions);

try {
  await bundle.write(outputOptions);
} finally {
  await bundle.close();
}
