import path from 'path';

import * as fsExtra from 'fs-extra';

import { log } from '../../utils/logging';

const RECOMMENDATIONS = ['esbenp.prettier-vscode', 'dbaeumer.vscode-eslint'];

export async function setupVSCode(destinationDir: string): Promise<void> {
  try {
    await createVSCodeDirectory(destinationDir);
    await addRecommendations(destinationDir);
  } catch {
    log.err('Failed to add vsCode recommendations', log.bold(destinationDir));
  }
}

export async function createVSCodeDirectory(
  destinationDir: string,
): Promise<void> {
  const vscodeDirPath = path.join(destinationDir, '.vscode');
  await fsExtra.ensureDir(vscodeDirPath);
}

export async function addRecommendations(
  destinationDir: string,
): Promise<void> {
  const vscodeDirPath = path.join(destinationDir, '.vscode');
  const extensionsJsonPath = path.join(vscodeDirPath, 'extensions.json');
  const extensionsJsonContent = {
    recommendations: RECOMMENDATIONS,
  };

  await fsExtra.writeJson(extensionsJsonPath, extensionsJsonContent, {
    spaces: 2,
  });
}
