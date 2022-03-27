// Adapted from https://github.com/changesets/action/blob/21240c3cd1d2efa2672d64e0235a03cf139b83e6/src/run.test.ts

import path from 'path';

import type { Changeset } from '@changesets/types';
import writeChangeset from '@changesets/write';
import fs from 'fs-extra';

import * as gitUtils from './gitUtils';
import * as github from './githubAdapter';
import { runVersion } from './run';

jest.spyOn(console, 'log').mockImplementation();

jest.mock('./githubAdapter', () => ({ getOctokit: jest.fn() }));
jest.mock('./gitUtils');

jest.mocked(gitUtils.context).mockResolvedValue({
  repo: {
    owner: 'changesets',
    repo: 'action',
  },
  ref: 'refs/heads/some-branch',
  sha: 'xeac7',
});

const mockedGithubMethods = {
  search: {
    issuesAndPullRequests: jest.fn(),
  },
  pulls: {
    create: jest.fn(),
  },
  repos: {
    createRelease: jest.fn(),
  },
};
(github.getOctokit as any).mockImplementation(() => mockedGithubMethods);

const linkNodeModules = async (cwd: string) => {
  await fs.symlink(
    path.join(__dirname, '..', 'node_modules'),
    path.join(cwd, 'node_modules'),
  );
};
const writeChangesets = (changesets: Changeset[], cwd: string) =>
  Promise.all(changesets.map((commit) => writeChangeset(commit, cwd)));

beforeEach(() => {
  jest.clearAllMocks();
});

const fCopy = async (source: string, destination: string) => {
  const destinationFolder = './tmp';
  const sourceFolder = './integration/changesets';

  const sourcePath = path.join(sourceFolder, source);
  const destinationPath = path.join(destinationFolder, destination);
  await fs.promises.cp(sourcePath, destinationPath, {
    recursive: true,
  });
  await linkNodeModules(destinationPath);
  return destinationPath;
};

const fCleanup = async () => {
  await fs.promises.rm('./tmp', { recursive: true, force: true });
};

afterAll(async () => {
  await fCleanup();
});

describe('version', () => {
  it('creates simple PR', async () => {
    const destination = 'simple-pr';
    const cwd = await fCopy('simple-project', destination);

    mockedGithubMethods.search.issuesAndPullRequests.mockImplementationOnce(
      () => ({ data: { items: [] } }),
    );

    await writeChangesets(
      [
        {
          releases: [
            {
              name: 'simple-project-pkg-a',
              type: 'minor',
            },
            {
              name: 'simple-project-pkg-b',
              type: 'minor',
            },
          ],
          summary: 'Awesome feature',
        },
      ],
      cwd,
    );

    await runVersion({
      cwd,
      commitMessage: 'Version Packages',
      prTitle: 'Version Packages',
    });

    expect(mockedGithubMethods.pulls.create.mock.calls[0]).toMatchSnapshot();
  });

  it('only includes bumped packages in the PR body', async () => {
    const destination = 'bumped-pr';
    const cwd = await fCopy('simple-project', destination);

    mockedGithubMethods.search.issuesAndPullRequests.mockImplementationOnce(
      () => ({ data: { items: [] } }),
    );

    await writeChangesets(
      [
        {
          releases: [
            {
              name: 'simple-project-pkg-a',
              type: 'minor',
            },
          ],
          summary: 'Awesome feature',
        },
      ],
      cwd,
    );

    await runVersion({
      cwd,
      commitMessage: 'Version Packages',
      prTitle: 'Version Packages',
    });

    expect(mockedGithubMethods.pulls.create.mock.calls[0]).toMatchSnapshot();
  });

  it("doesn't include ignored package that got a dependency update in the PR body", async () => {
    const destination = 'ignored-pr';
    const cwd = await fCopy('ignored-package', destination);

    mockedGithubMethods.search.issuesAndPullRequests.mockImplementationOnce(
      () => ({ data: { items: [] } }),
    );

    await writeChangesets(
      [
        {
          releases: [
            {
              name: 'ignored-package-pkg-b',
              type: 'minor',
            },
          ],
          summary: 'Awesome feature',
        },
      ],
      cwd,
    );

    await runVersion({
      cwd,
      commitMessage: 'Version Packages',
      prTitle: 'Version Packages',
    });

    expect(mockedGithubMethods.pulls.create.mock.calls[0]).toMatchSnapshot();
  });
});
