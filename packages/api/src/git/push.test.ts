import git from 'isomorphic-git';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { push } from './push.js';

vi.mock('isomorphic-git');

afterEach(vi.resetAllMocks);

describe('push', () => {
  it('propagates props to isomorphic-git', async () => {
    vi.mocked(git.listRemotes).mockResolvedValue([
      { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
    ]);

    vi.mocked(git.push).mockResolvedValue({
      ok: true,
      error: null,
      refs: {},
    });

    await expect(
      push({
        auth: { token: 'abc', type: 'gitHubApp' },
        dir: '/workdir/skuba',
        ref: 'c'.repeat(40),
        remoteRef: 'feature-a',
      }),
    ).resolves.toStrictEqual({
      error: null,
      ok: true,
      refs: {},
    });

    expect(git.push).toHaveBeenCalledTimes(1);
    expect(vi.mocked(git.push).mock.calls[0]![0]).toMatchInlineSnapshot(
      { http: expect.any(Object), fs: expect.any(Object) },
      `
      {
        "dir": "/workdir/skuba",
        "force": undefined,
        "fs": Any<Object>,
        "http": Any<Object>,
        "onAuth": [Function],
        "ref": "cccccccccccccccccccccccccccccccccccccccc",
        "remote": undefined,
        "remoteRef": "feature-a",
        "url": "https://github.com/seek-oss/skuba",
      }
    `,
    );
  });
});
