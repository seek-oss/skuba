import type Git from 'isomorphic-git' with { 'resolution-mode': 'import' };

import { commit } from './commit';

jest.mock('isomorphic-git');

const git = jest.requireMock<typeof Git>('isomorphic-git');

afterEach(jest.resetAllMocks);

describe('commit', () => {
  it('propagates props to isomorphic-git', async () => {
    jest.mocked(git.commit).mockResolvedValue('b'.repeat(40));

    await expect(
      commit({
        dir: '/workdir/skuba',
        message: 'Test for regression',
      }),
    ).resolves.toBe('b'.repeat(40));

    expect(git.commit).toHaveBeenCalledTimes(1);
    expect(jest.mocked(git.commit).mock.calls[0]![0]).toMatchInlineSnapshot(
      { fs: expect.any(Object) },
      `
      {
        "author": {
          "name": "skuba",
        },
        "committer": {
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
