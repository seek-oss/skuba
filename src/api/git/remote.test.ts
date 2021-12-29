import git from 'isomorphic-git';

import { getOwnerAndRepo } from './remote';

jest.mock('isomorphic-git');

const dir = process.cwd();

afterEach(jest.resetAllMocks);

describe('getOwnerAndRepo', () => {
  it('extracts an owner and repo from an HTTP GitHub remote', async () => {
    jest.jest
      .mocked(git.listRemotes)
      .mockResolvedValue([
        { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
      ]);

    await expect(getOwnerAndRepo({ dir })).resolves.toStrictEqual({
      owner: 'seek-oss',
      repo: 'skuba',
    });
  });

  it('extracts an owner and repo from an SSH GitHub remote', async () => {
    jest.jest.mocked(git.listRemotes).mockResolvedValue([
      {
        remote: 'origin',
        url: 'git@github.com:SEEK-Jobs/secret-codebase.git',
      },
    ]);

    await expect(getOwnerAndRepo({ dir })).resolves.toStrictEqual({
      owner: 'SEEK-Jobs',
      repo: 'secret-codebase',
    });
  });

  it('throws on zero remotes', async () => {
    jest.jest.mocked(git.listRemotes).mockResolvedValue([]);

    await expect(
      getOwnerAndRepo({ dir }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Could not find a GitHub remote"`,
    );
  });

  it('throws on unrecognised remotes', async () => {
    jest.jest.mocked(git.listRemotes).mockResolvedValue([
      { remote: 'public', url: 'git@gitlab.com:seek-oss/skuba.git' },
      {
        remote: 'private',
        url: 'https://gitlab.com/SEEK-Jobs/secret-codebase.git',
      },
    ]);

    await expect(
      getOwnerAndRepo({ dir }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Could not find a GitHub remote"`,
    );
  });
});
