import findUp from 'find-up';
import fs from 'fs-extra';

export const checkServerlessVersion = async () => {
  const packageJsonPath = await findUp('package.json', { cwd: process.cwd() });
  if (!packageJsonPath) {
    throw new Error('package.json not found');
  }
  const packageJson = await fs.readFile(packageJsonPath);

  try {
    const serverlessVersion = (
      JSON.parse(packageJson.toString()) as {
        devDependencies: Record<string, string>;
      }
    ).devDependencies.serverless;
    if (!serverlessVersion) {
      return;
    }

    if (!serverlessVersion.startsWith('4')) {
      throw new Error(
        'Serverless version not supported, please upgrade to 4.x',
      );
    }
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message.includes('Cannot read properties of undefined')
    ) {
      return;
    }
    throw error;
  }
};
