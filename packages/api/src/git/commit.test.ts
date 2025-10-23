import git from 'isomorphic-git';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { commit } from './commit.js';

vi.mock('isomorphic-git');

afterEach(vi.resetAllMocks);

describe('commit', () => {
  it('propagates props to isomorphic-git', async () => {
    vi.mocked(git.commit).mockResolvedValue('b'.repeat(40));

    await expect(
      commit({
        dir: '/workdir/skuba',
        message: 'Test for regression',
      }),
    ).resolves.toBe('b'.repeat(40));

    expect(git.commit).toHaveBeenCalledTimes(1);
    expect(vi.mocked(git.commit).mock.calls[0]![0]).toMatchInlineSnapshot(
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
