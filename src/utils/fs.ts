import fs from 'fs-extra';
export const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.promises.access(filePath);

    return true; // Path exists and is accessible
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false; // Path does not exist
    }
    throw error; // Other errors (include permission issues)
  }
};
