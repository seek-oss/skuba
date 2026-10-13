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

describe('migrateOxfmtVscode', () => {
  it('creates .vscode/settings.json when it does not exist', async () => {
    await migrateOxfmtVscode(process.cwd());

    expect(readSettings()).toEqual({
      'editor.formatOnSave': true,
      '[javascript]': { 'editor.defaultFormatter': 'oxc.oxc-vscode' },
      '[typescript]': { 'editor.defaultFormatter': 'oxc.oxc-vscode' },
    });
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
      'editor.formatOnSave': true,
      '[typescript]': {
        'editor.tabSize': 2,
        'editor.defaultFormatter': 'oxc.oxc-vscode',
      },
      '[javascript]': { 'editor.defaultFormatter': 'oxc.oxc-vscode' },
    });
  });

  it('replaces a wrong formatter value', async () => {
    vol.fromJSON(
      {
        '.vscode/settings.json': JSON.stringify({
          '[typescript]': { 'editor.defaultFormatter': 'esbenp.prettier-vscode' },
        }),
      },
      process.cwd(),
    );

    await migrateOxfmtVscode(process.cwd());

    expect(readSettings()).toEqual({
      'editor.formatOnSave': true,
      '[typescript]': { 'editor.defaultFormatter': 'oxc.oxc-vscode' },
      '[javascript]': { 'editor.defaultFormatter': 'oxc.oxc-vscode' },
    });
  });

  it('is idempotent when oxfmt is already configured', async () => {
    const settings = {
      'editor.formatOnSave': true,
      '[javascript]': { 'editor.defaultFormatter': 'oxc.oxc-vscode' },
      '[typescript]': { 'editor.defaultFormatter': 'oxc.oxc-vscode' },
    };

    vol.fromJSON(
      { '.vscode/settings.json': JSON.stringify(settings, null, 2) },
      process.cwd(),
    );

    await migrateOxfmtVscode(process.cwd());

    expect(readSettings()).toEqual(settings);
  });

  it('preserves JSONC comments in an existing file', async () => {
    vol.fromJSON(
      {
        '.vscode/settings.json': [
          '{',
          '  // Use ESLint for code actions',
          '  "[typescript]": {',
          '    "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" }',
          '  }',
          '}',
        ].join('\n'),
      },
      process.cwd(),
    );

    await migrateOxfmtVscode(process.cwd());

    const raw = volToJson()['.vscode/settings.json'] as string;

    expect(raw).toContain('// Use ESLint for code actions');
    expect(raw).toContain('"editor.defaultFormatter": "oxc.oxc-vscode"');
    expect(raw).toContain('"editor.formatOnSave": true');
  });
});
