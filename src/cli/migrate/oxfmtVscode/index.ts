import path from 'path';

import fs from 'fs-extra';

import { log } from '../../../utils/logging.js';

const VSCODE_SETTINGS_PATH = '.vscode/settings.json';

const OXFMT_LANGUAGE_IDS = ['[javascript]', '[typescript]'] as const;

export const migrateOxfmtVscode = async (dir = process.cwd()) => {
  const settingsPath = path.join(dir, VSCODE_SETTINGS_PATH);

  log.plain('Configuring oxfmt as the VS Code formatter...');

  let existing: Record<string, unknown> = {};

  try {
    const raw = await fs.promises.readFile(settingsPath, 'utf-8');
    existing = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // File doesn't exist or contains invalid JSON; start fresh
  }

  const updated: Record<string, unknown> = {
    ...existing,
    'editor.formatOnSave': true,
  };

  for (const lang of OXFMT_LANGUAGE_IDS) {
    updated[lang] = {
      ...(existing[lang] as Record<string, unknown> | undefined),
      'editor.defaultFormatter': 'oxc.oxc-vscode',
    };
  }

  await fs.promises.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.promises.writeFile(
    settingsPath,
    `${JSON.stringify(updated, null, 2)}\n`,
    'utf-8',
  );

  log.ok('Configured oxfmt as the VS Code formatter in .vscode/settings.json');
};
