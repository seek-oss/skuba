import git from 'isomorphic-git';

import { push } from './push.js';

jest.mock('isomorphic-git');

afterEach(jest.resetAllMocks);

describe('push', () => {
  it('propagates props to isomorphic-git', async () => {
    jest
      .mocked(git.listRemotes)
      .mockResolvedValue([
        { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
      ]);

    jest.mocked(git.push).mockResolvedValue({
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
    expect(jest.mocked(git.push).mock.calls[0]![0]).toMatchInlineSnapshot(
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
