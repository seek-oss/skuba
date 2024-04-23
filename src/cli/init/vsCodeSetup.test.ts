import * as path from 'path';

import fsExtra from 'fs-extra';

import { addRecommendations, createVSCodeDirectory } from './vsCodeSetup';

// Mock fs-extra to avoid actual file system operations
jest.mock('fs-extra', () => ({
  ensureDir: jest.fn(),
  writeJson: jest.fn(),
}));

describe('VSCode Setup', () => {
  const destinationDir = '/fake/path';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createVSCodeDirectory', () => {
    it('should ensure the .vscode directory exists', async () => {
      await createVSCodeDirectory(destinationDir);
      expect(fsExtra.ensureDir).toHaveBeenCalledWith(
        path.join(destinationDir, '.vscode'),
      );
    });
  });

  describe('addRecommendations', () => {
    it('should write recommendations to extensions.json', async () => {
      await addRecommendations(destinationDir);
      expect(fsExtra.writeJson).toHaveBeenCalledWith(
        path.join(destinationDir, '.vscode', 'extensions.json'),
        {
          recommendations: ['esbenp.prettier-vscode', 'dbaeumer.vscode-eslint'],
        },
        { spaces: 2 },
      );
    });
  });
});
