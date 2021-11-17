import type { ReadCommitResult } from 'isomorphic-git';
import git from 'isomorphic-git';
import { mocked } from 'ts-jest/utils';

import { getHeadSha, getOwnerRepo, gitCommit, gitPush } from './git';

jest.mock('isomorphic-git');

const dir = process.cwd();

beforeEach(() => {
  mocked(git.listRemotes).mockResolvedValue([
    { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
  ]);
  mocked(git.log).mockResolvedValue([
    { oid: 'a'.repeat(40) } as ReadCommitResult,
  ]);
  mocked(git.push).mockResolvedValue({
    ok: true,
    error: null,
    refs: {},
  });
  mocked(git.commit).mockResolvedValue('b'.repeat(40));
});

afterEach(jest.resetAllMocks);

describe('gitCommit', () => {
  it('should propagate props to isomorphic-git', async () => {
    await expect(
      gitCommit({
        dir: '/workdir/skuba',
        message: 'Test for regression',
      }),
    ).resolves.toBe('b'.repeat(40));

    expect(git.commit).toHaveBeenCalledTimes(1);
    expect(mocked(git.commit).mock.calls[0][0]).toMatchInlineSnapshot(
      { fs: expect.any(Object) },
      `
      Object {
        "author": Object {
          "name": "skuba",
        },
        "committer": Object {
          "name": "skuba",
        },
        "dir": "/workdir/skuba",
        "fs": Any<Object>,
        "message": "Test for regression",
      }
    `,
    );
  });
});

describe('gitPush', () => {
  it('should propagate props to isomorphic-git', async () => {
    await expect(
      gitPush({
        auth: { token: 'abc', type: 'gitHubApp' },
        branch: 'feature-a',
        commitOid: 'c'.repeat(40),
        dir: '/workdir/skuba',
      }),
    ).resolves.toStrictEqual({
      error: null,
      ok: true,
      refs: {},
    });

    expect(git.push).toHaveBeenCalledTimes(1);
    expect(mocked(git.push).mock.calls[0][0]).toMatchInlineSnapshot(
      { http: expect.any(Object), fs: expect.any(Object) },
      `
      Object {
        "dir": "/workdir/skuba",
        "fs": Any<Object>,
        "http": Any<Object>,
        "onAuth": [Function],
        "ref": "cccccccccccccccccccccccccccccccccccccccc",
        "remoteRef": "feature-a",
        "url": "https://github.com/seek-oss/skuba",
      }
    `,
    );
  });
});

describe('getOwnerRepo', () => {
  it('should extract a GitHub owner and repo from Git remotes', () =>
    expect(getOwnerRepo(dir)).resolves.toStrictEqual({
      owner: 'seek-oss',
      repo: 'skuba',
    }));
});

describe('getHeadSha', () => {
  it('should extract a commit hash from the Git log', () =>
    expect(getHeadSha(dir)).resolves.toBe('a'.repeat(40)));
});
