import git from 'isomorphic-git';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fastForwardBranch } from './pull.js';

vi.mock('isomorphic-git');

afterEach(vi.resetAllMocks);

describe('fastForwardBranch', () => {
  it('propagates props to isomorphic-git', async () => {
    vi.mocked(git.listRemotes).mockResolvedValue([
      { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
    ]);

    await fastForwardBranch({
      auth: { token: 'abc', type: 'gitHubApp' },
      dir: '/workdir/skuba',
      ref: 'c'.repeat(40),
      remoteRef: 'feature-a',
    });

    expect(git.fastForward).toHaveBeenCalledTimes(1);
    expect(vi.mocked(git.fastForward).mock.calls[0]![0]).toMatchInlineSnapshot(
      { http: expect.any(Object), fs: expect.any(Object) },
      `
      {
        "dir": "/workdir/skuba",
        "fs": Any<Object>,
        "http": Any<Object>,
        "onAuth": [Function],
        "ref": "cccccccccccccccccccccccccccccccccccccccc",
        "remote": undefined,
        "remoteRef": "feature-a",
        "singleBranch": true,
        "url": "https://github.com/seek-oss/skuba",
      }
    `,
    );
  });
});
