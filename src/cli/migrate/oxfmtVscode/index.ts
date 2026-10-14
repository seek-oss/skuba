import path from 'path';

import { type Edit, parseAsync } from '@ast-grep/napi';
import * as Git from '@skuba-lib/api/git';
import fs from 'fs-extra';

import { log } from '../../../utils/logging.js';
import { registerAstGrepLanguages } from '../../lint/internalLints/registerAstGrepLanguages.js';

const VSCODE_SETTINGS_PATH = '.vscode/settings.json';

const OXFMT_LANGUAGE_IDS = ['[javascript]', '[typescript]'] as const;

const EMPTY_SETTINGS = '{\n}\n';

const applyToExisting = async (contents: string): Promise<string> => {
  registerAstGrepLanguages();

  const root = (await parseAsync('json', contents)).root();
  const edits: Edit[] = [];

  const toInsert: string[] = [];

  const formatOnSavePair = root.find({
    rule: {
      kind: 'pair',
      has: { field: 'key', regex: '^"editor\\.formatOnSave"$' },
    },
  });

  if (!formatOnSavePair) {
    toInsert.push('"editor.formatOnSave": true');
  }

  if (formatOnSavePair && formatOnSavePair.field('value')?.text() !== 'true') {
    edits.push(formatOnSavePair.replace('"editor.formatOnSave": true'));
  }

  for (const lang of OXFMT_LANGUAGE_IDS) {
    const escapedLang = lang.replaceAll('[', '\\[').replaceAll(']', '\\]');

    const langPair = root.find({
      rule: {
        kind: 'pair',
        has: { field: 'key', regex: `^"${escapedLang}"$` },
      },
    });

    if (!langPair) {
      toInsert.push(
        `"${lang}": {\n    "editor.defaultFormatter": "oxc.oxc-vscode"\n  }`,
      );
      continue;
    }

    const formatterPair = langPair.find({
      rule: {
        kind: 'pair',
        has: { field: 'key', regex: '^"editor\\.defaultFormatter"$' },
      },
    });

    if (!formatterPair) {
      const langOpenBrace = langPair.find({ rule: { pattern: '{' } });
      if (langOpenBrace) {
        edits.push(
          langOpenBrace.replace(
            '{\n    "editor.defaultFormatter": "oxc.oxc-vscode",',
          ),
        );
      }
      continue;
    }

    if (formatterPair.field('value')?.text() !== '"oxc.oxc-vscode"') {
      edits.push(
        formatterPair.replace('"editor.defaultFormatter": "oxc.oxc-vscode"'),
      );
    }
  }

  if (toInsert.length > 0) {
    const openBrace = root.find({ rule: { pattern: '{' } });
    if (openBrace) {
      const hasExistingPairs =
        root.findAll({ rule: { kind: 'pair' } }).length > 0;
      // When the object is empty there are no existing entries to separate
      // from, so omit the trailing comma and close cleanly on a new line.
      const insertion = hasExistingPairs
        ? `{\n  ${toInsert.join(',\n  ')},`
        : `{\n  ${toInsert.join(',\n  ')}\n`;
      edits.push(openBrace.replace(insertion));
    }
  }

  if (edits.length === 0) {
    return contents;
  }

  return root.commitEdits(edits);
};

export const migrateOxfmtVscode = async (cwd = process.cwd()) => {
  const gitRoot = (await Git.findRoot({ dir: cwd })) ?? cwd;
  const settingsPath = path.join(gitRoot, VSCODE_SETTINGS_PATH);

  log.plain('Configuring oxfmt as the VS Code formatter...');

  let existingContents: string;
  try {
    existingContents = await fs.promises.readFile(settingsPath, 'utf-8');
  } catch {
    existingContents = EMPTY_SETTINGS;
    await fs.promises.mkdir(path.dirname(settingsPath), { recursive: true });
  }

  const newContents = await applyToExisting(existingContents);

  if (newContents !== existingContents) {
    await fs.promises.writeFile(settingsPath, newContents, 'utf-8');
  }

  log.ok('Configured oxfmt as the VS Code formatter in .vscode/settings.json');
};
