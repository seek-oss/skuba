import { beforeEach, describe, expect, it, vi } from 'vitest';

import memfs, { vol } from '../../../testing/memfs.js';

import { migrateOxfmtVscode } from './index.js';

vi.mock('fs-extra', () => ({
  ...memfs,
  default: memfs,
}));

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

const readSettings = () =>
  JSON.parse(volToJson()['.vscode/settings.json'] as string);

beforeEach(() => {
  vol.reset();
});

const EXPECTED_SETTINGS = {
  'editor.formatOnSave': true,
  '[javascript]': { 'editor.defaultFormatter': 'oxc.oxc-vscode' },
  '[typescript]': { 'editor.defaultFormatter': 'oxc.oxc-vscode' },
};

describe('migrateOxfmtVscode', () => {
  it('creates .vscode/settings.json when it does not exist', async () => {
    await migrateOxfmtVscode(process.cwd());

    expect(readSettings()).toEqual(EXPECTED_SETTINGS);
  });

  it('merges into an existing .vscode/settings.json', async () => {
    vol.fromJSON(
      {
        '.vscode/settings.json': JSON.stringify({
          'editor.formatOnSave': true,
          '[typescript]': { 'editor.tabSize': 2 },
        }),
      },
      process.cwd(),
    );

    await migrateOxfmtVscode(process.cwd());

    expect(readSettings()).toEqual({
      ...EXPECTED_SETTINGS,
      '[typescript]': {
        'editor.tabSize': 2,
        'editor.defaultFormatter': 'oxc.oxc-vscode',
      },
    });
  });

  it('is idempotent when oxfmt is already configured', async () => {
    vol.fromJSON(
      { '.vscode/settings.json': JSON.stringify(EXPECTED_SETTINGS) },
      process.cwd(),
    );

    await migrateOxfmtVscode(process.cwd());

    expect(readSettings()).toEqual(EXPECTED_SETTINGS);
  });
});
