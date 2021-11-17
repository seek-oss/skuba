// Adapted from https://github.com/changesets/action/blob/21240c3cd1d2efa2672d64e0235a03cf139b83e6/src/index.ts
/* eslint-disable no-sync */
/* eslint-disable no-console */
import fs from 'fs-extra';

import * as core from './coreAdapter';
import * as gitUtils from './gitUtils';
import readChangesetState from './readChangesetState';
import { runPublish, runVersion } from './run';

const getOptionalInput = (name: string) => core.getInput(name) || undefined;

const run = async () => {
  const githubToken = process.env.GITHUB_TOKEN;

  if (!githubToken) {
    core.setFailed('Please add the GITHUB_TOKEN to the changesets action');
    return;
  }

  console.log('setting git user');
  await gitUtils.setupUser();

  console.log('setting GitHub credentials');
  await fs.writeFile(
    `${process.env.HOME as string}/.netrc`,
    `machine github.com\nlogin github-actions[bot]\npassword ${githubToken}`,
  );

  const { changesets } = await readChangesetState();

  const publishScript = core.getInput('publish');
  const hasChangesets = changesets.length !== 0;
  const hasPublishScript = Boolean(publishScript);

  core.setOutput('published', 'false');
  core.setOutput('publishedPackages', '[]');
  core.setOutput('hasChangesets', String(hasChangesets));

  switch (true) {
    case !hasChangesets && !hasPublishScript:
      console.log('No changesets found');
      return;
    case !hasChangesets && hasPublishScript: {
      console.log(
        'No changesets found, attempting to publish any unpublished packages to npm',
      );

      const userNpmrcPath = `${process.env.HOME as string}/.npmrc`;
      if (fs.existsSync(userNpmrcPath)) {
        console.log('Found existing user .npmrc file');
        const userNpmrcContent = await fs.readFile(userNpmrcPath, 'utf8');
        const authLine = userNpmrcContent.split('\n').find((line) =>
          // check based on https://github.com/npm/cli/blob/8f8f71e4dd5ee66b3b17888faad5a7bf6c657eed/test/lib/adduser.js#L103-L105
          /^\s*\/\/registry\.npmjs\.org\/:[_-]authToken=/i.test(line),
        );
        if (authLine) {
          console.log(
            'Found existing auth token for the npm registry in the user .npmrc file',
          );
        } else {
          console.log(
            "Didn't find existing auth token for the npm registry in the user .npmrc file, creating one",
          );
          fs.appendFileSync(
            userNpmrcPath,
            `\n//registry.npmjs.org/:_authToken=${
              process.env.NPM_TOKEN as string
            }\n`,
          );
        }
      } else {
        console.log('No user .npmrc file found, creating one');
        fs.writeFileSync(
          userNpmrcPath,
          `//registry.npmjs.org/:_authToken=${
            process.env.NPM_TOKEN as string
          }\n`,
        );
      }

      const result = await runPublish({
        script: publishScript as string,
        githubToken,
      });

      if (result.published) {
        core.setOutput('published', 'true');
        core.setOutput(
          'publishedPackages',
          JSON.stringify(result.publishedPackages),
        );
      }
      return;
    }
    case hasChangesets:
      await runVersion({
        script: getOptionalInput('version'),
        githubToken,
        prTitle: getOptionalInput('title'),
        commitMessage: getOptionalInput('commit'),
        hasPublishScript,
      });
      return;
  }
};

export const changeset = async () => {
  await run().catch((err: unknown) => {
    console.error(err);
    core.setFailed((err as Error).message);
  });
};
