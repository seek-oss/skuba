import chalk from 'chalk';
import readPkgUp from 'read-pkg-up';

interface GetDestinationManifestProps {
  cwd?: string;
}

export const getDestinationManifest = async (
  props?: GetDestinationManifestProps,
) => {
  const result = await readPkgUp(props);

  if (typeof result === 'undefined') {
    console.error(
      chalk.red(
        `Could not locate a ${chalk.bold(
          'package.json',
        )} in your working directory.`,
      ),
    );
    process.exit(1);
  }

  return result;
};
