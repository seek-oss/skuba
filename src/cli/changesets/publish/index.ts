import * as git from '../../../api/git';
import { createExec } from '../../../utils/exec';
import type { Logger } from '../../../utils/logging';

import { releasePackages } from './release';

interface PublishOptions {
  dir: string;
}
export const runPublish = async (logger: Logger, { dir }: PublishOptions) => {
  const existingTags = await git.getTags({ dir });

  const exec = createExec({ cwd: dir });
  const publishOutput = await exec('changeset', 'publish');

  const currentTags = await git.getTags({ dir });

  const newTags = currentTags.filter((tag) => !new Set(existingTags).has(tag));

  await Promise.all(
    newTags.map((tag) =>
      git.push({
        auth: { type: 'gitHubApp' },
        ref: tag,
        dir,
      }),
    ),
  );

  const releaseResults = await releasePackages(dir, publishOutput.stdout);

  if (releaseResults.published) {
    const resultString = releaseResults
      .publishedPackages!.map((pkg) => `${pkg.name}@${pkg.version})}`)
      .join(', ');
    logger.plain(`Successfully released ${resultString}.`);
    return;
  }

  logger.plain('No packages released');
};
