import git from 'isomorphic-git';

import { fastForwardBranch } from './pull';

jest.mock('isomorphic-git');

afterEach(jest.resetAllMocks);

describe('pull', () => {
  it('propagates props to isomorphic-git', async () => {
    jest
      .mocked(git.listRemotes)
      .mockResolvedValue([
        { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
      ]);

    jest.mocked(git.fastForward).mockResolvedValue();

    await expect(
      fastForwardBranch({
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

    expect(git.pull).toHaveBeenCalledTimes(1);
    expect(jest.mocked(git.pull).mock.calls[0][0]).toMatchInlineSnapshot(
      { http: expect.any(Object), fs: expect.any(Object) },
      `
      Object {
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
