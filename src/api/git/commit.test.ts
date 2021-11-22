import git from 'isomorphic-git';
import { mocked } from 'ts-jest/utils';

import { commit } from './commit';

jest.mock('isomorphic-git');

afterEach(jest.resetAllMocks);

describe('commit', () => {
  it('propagates props to isomorphic-git', async () => {
    mocked(git.commit).mockResolvedValue('b'.repeat(40));

    await expect(
      commit({
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
