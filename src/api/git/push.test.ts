import git from 'isomorphic-git';
import { mocked } from 'ts-jest/utils';

import { push } from './push';

jest.mock('isomorphic-git');

afterEach(jest.resetAllMocks);

describe('push', () => {
  it('propagates props to isomorphic-git', async () => {
    mocked(git.listRemotes).mockResolvedValue([
      { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
    ]);

    mocked(git.push).mockResolvedValue({
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
    expect(mocked(git.push).mock.calls[0][0]).toMatchInlineSnapshot(
      { http: expect.any(Object), fs: expect.any(Object) },
      `
      Object {
        "dir": "/workdir/skuba",
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
