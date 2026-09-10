import { parseChangesetFile as parse } from '@changesets/parse';
import type { ModCompWithPackage } from '@changesets/types';
import { afterEach, describe, expect, it, test, vi } from 'vitest';

import changelogFunctions from './index.js';

const getReleaseLine = changelogFunctions.getReleaseLine;
const getDependencyReleaseLine = changelogFunctions.getDependencyReleaseLine;

afterEach(() => {
  vi.unstubAllEnvs();
});

vi.mock(
  '@changesets/get-github-info',
  (): typeof import('@changesets/get-github-info') => {
    const data = {
      commit: 'a085003',
      author: 'Andarist',
      pull: 1613,
      repo: 'emotion-js/emotion',
    };
    const urls = {
      commit: `https://github.com/${data.repo}/commit/${data.commit}`,
      pull: `https://github.com/${data.repo}/pull/${data.pull}`,
      author: `https://github.com/${data.author}`,
    };
    const markdownLinks = {
      commit: `[\`${data.commit.slice(0, 7)}\`](${urls.commit})`,
      pull: `[#${data.pull}](${urls.pull})`,
      author: `[@${data.author}](${urls.author})`,
    };
    return {
      /* eslint-disable vitest/no-standalone-expect */
      getCommitInfo({ commit, repo }) {
        expect(commit).toBe(data.commit);
        expect(repo).toBe(data.repo);
        return Promise.resolve({
          commit: {
            sha: data.commit,
            url: urls.commit,
            markdownLink: markdownLinks.commit,
          },
          author: {
            login: data.author,
            url: urls.author,
            markdownLink: markdownLinks.author,
          },
          pull: {
            number: data.pull,
            url: urls.pull,
            markdownLink: markdownLinks.pull,
          },
        });
      },
      getPullRequestInfo({ pull, repo }) {
        expect(pull).toBe(data.pull);
        expect(repo).toBe(data.repo);
        return Promise.resolve({
          commit: {
            sha: data.commit,
            url: urls.commit,
            markdownLink: markdownLinks.commit,
          },
          author: {
            login: data.author,
            url: urls.author,
            markdownLink: markdownLinks.author,
          },
          pull: {
            number: data.pull,
            url: urls.pull,
            markdownLink: markdownLinks.pull,
          },
        });
      },
      /* eslint-enable vitest/no-standalone-expect */
    };
  },
);

const getChangeset = (content: string, commit: string | undefined) =>
  [
    {
      ...parse(
        `---
pkg: "minor"
---

something
${content}
`,
      ),
      id: 'some-id',
      commit,
    },
    'minor',
    { repo: data.repo },
  ] as const;

const data = {
  commit: 'a085003',
  user: 'Andarist',
  pull: 1613,
  repo: 'emotion-js/emotion',
};

it('uses GITHUB_REPOSITORY when repo option is absent', async () => {
  vi.stubEnv('GITHUB_REPOSITORY', data.repo);
  const [changeset, releaseType] = getChangeset('', data.commit);

  await expect(getReleaseLine(changeset, releaseType, null)).resolves.toBe(
    `\n\n- something ([#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003))\n`,
  );
});

it('uses explicit repo option before GITHUB_REPOSITORY', async () => {
  vi.stubEnv('GITHUB_REPOSITORY', 'other/repo');

  await expect(getReleaseLine(...getChangeset('', data.commit))).resolves.toBe(
    `\n\n- something ([#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003))\n`,
  );
});

it('uses GITHUB_REPOSITORY for dependency release lines', async () => {
  vi.stubEnv('GITHUB_REPOSITORY', data.repo);

  const changeset = {
    ...parse(
      `---
pkg: "minor"
---

something
`,
    ),
    id: 'some-id',
    commit: data.commit,
  };

  const dependency: ModCompWithPackage = {
    name: 'pkg',
    type: 'patch',
    oldVersion: '0.0.1',
    newVersion: '1.0.0',
    changesets: [],
    dir: '/repo/pkg',
    packageJson: {
      name: 'pkg',
      version: '0.0.1',
    },
  };

  await expect(
    getDependencyReleaseLine([changeset], [dependency], {
      disableDependencyLinks: false,
    }),
  ).resolves.toMatchInlineSnapshot(`
    "- Updated dependencies [[\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003)]:
      - pkg@1.0.0"
  `);

  await expect(getDependencyReleaseLine([changeset], [dependency], null))
    .resolves.toMatchInlineSnapshot(`
    "- Updated dependencies:
      - pkg@1.0.0"
  `);
});

describe.each([data.commit, 'wrongcommit', undefined])(
  'with commit from changeset of %s',
  (commitFromChangeset) => {
    describe.each(['pr', 'pull request', 'pull'])(
      'override pr with %s keyword',
      (keyword) => {
        test.each(['with #', 'without #'] as const)('%s', async (kind) => {
          await expect(
            getReleaseLine(
              ...getChangeset(
                `${keyword}: ${kind === 'with #' ? '#' : ''}${data.pull}`,
                commitFromChangeset,
              ),
            ),
          ).resolves.toBe(
            `\n\n- something ([#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003))\n`,
          );
        });
      },
    );
    test('override commit with commit keyword', async () => {
      await expect(
        getReleaseLine(
          ...getChangeset(`commit: ${data.commit}`, commitFromChangeset),
        ),
      ).resolves.toBe(
        `\n\n- something ([#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003))\n`,
      );
    });
  },
);

describe.each(['author', 'user'])(
  'override author with %s keyword',
  (keyword) => {
    test.each(['with @', 'without @'] as const)('%s', async (kind) => {
      const [changeset, releaseType, options] = getChangeset(
        `${keyword}: ${kind === 'with @' ? '@' : ''}other`,
        data.commit,
      );
      await expect(
        getReleaseLine(changeset, releaseType, {
          ...options,
          disableThanks: false,
        }),
      ).resolves.toBe(
        `\n\n- something ([#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003)) Thanks [@other](https://github.com/other)!\n`,
      );
    });
  },
);

it('linkifies bare issue references', async () => {
  await expect(
    getReleaseLine(...getChangeset('fixes #1234 and #5678', data.commit)),
  ).resolves.toMatchInlineSnapshot(`
    "

    - something ([#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003))
      fixes [#1234](https://github.com/emotion-js/emotion/issues/1234) and [#5678](https://github.com/emotion-js/emotion/issues/5678)"
  `);
});

it('does not double-linkify existing markdown links', async () => {
  await expect(
    getReleaseLine(
      ...getChangeset(
        'see [#1234](https://github.com/emotion-js/emotion/issues/1234)',
        data.commit,
      ),
    ),
  ).resolves.toMatchInlineSnapshot(`
    "

    - something ([#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003))
      see [#1234](https://github.com/emotion-js/emotion/issues/1234)"
  `);
});

it('does not linkify issue-like refs inside link text', async () => {
  await expect(
    getReleaseLine(
      ...getChangeset('see [fix for #99](https://example.com)', data.commit),
    ),
  ).resolves.toMatchInlineSnapshot(`
    "

    - something ([#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003))
      see [fix for #99](https://example.com)"
  `);
});

it('does not linkify when preceded by a word character', async () => {
  await expect(getReleaseLine(...getChangeset('foo#123', data.commit))).resolves
    .toMatchInlineSnapshot(`
    "

    - something ([#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003))
      foo#123"
  `);
});

it('does not linkify #0', async () => {
  await expect(getReleaseLine(...getChangeset('see #0', data.commit))).resolves
    .toMatchInlineSnapshot(`
    "

    - something ([#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003))
      see #0"
  `);
});

it('linkifies issue ref at the start of a line', async () => {
  await expect(getReleaseLine(...getChangeset('#42 was fixed', data.commit)))
    .resolves.toMatchInlineSnapshot(`
    "

    - something ([#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003))
      [#42](https://github.com/emotion-js/emotion/issues/42) was fixed"
  `);
});

it('linkifies issue ref after punctuation', async () => {
  await expect(getReleaseLine(...getChangeset('fixed (#99)', data.commit)))
    .resolves.toMatchInlineSnapshot(`
    "

    - something ([#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003))
      fixed ([#99](https://github.com/emotion-js/emotion/issues/99))"
  `);
});

it('handles mixed linked and bare refs', async () => {
  await expect(
    getReleaseLine(
      ...getChangeset(
        'fixes [#1](https://github.com/emotion-js/emotion/issues/1) and #2',
        data.commit,
      ),
    ),
  ).resolves.toMatchInlineSnapshot(`
    "

    - something ([#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003))
      fixes [#1](https://github.com/emotion-js/emotion/issues/1) and [#2](https://github.com/emotion-js/emotion/issues/2)"
  `);
});

it('linkifies issue ref followed by a dot', async () => {
  await expect(getReleaseLine(...getChangeset('this fixes #42.', data.commit)))
    .resolves.toMatchInlineSnapshot(`
    "

    - something ([#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003))
      this fixes [#42](https://github.com/emotion-js/emotion/issues/42)."
  `);
});

it('with multiple authors', async () => {
  const [changeset, releaseType, options] = getChangeset(
    ['author: @Andarist', 'author: @mitchellhamilton'].join('\n'),
    data.commit,
  );
  await expect(
    getReleaseLine(changeset, releaseType, {
      ...options,
      disableThanks: false,
    }),
  ).resolves.toMatchInlineSnapshot(`
    "

    - something ([#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003)) Thanks [@Andarist](https://github.com/Andarist), [@mitchellhamilton](https://github.com/mitchellhamilton)!
    "
  `);
});

it('includes thanks when disableThanks is false', async () => {
  const [changeset, releaseType, options] = getChangeset(
    'author: @Andarist',
    data.commit,
  );
  await expect(
    getReleaseLine(changeset, releaseType, {
      ...options,
      disableThanks: false,
    }),
  ).resolves.toMatchInlineSnapshot(`
    "

    - something ([#1613](https://github.com/emotion-js/emotion/pull/1613) [\`a085003\`](https://github.com/emotion-js/emotion/commit/a085003)) Thanks [@Andarist](https://github.com/Andarist)!
    "
  `);
});

it('bolds conventional commit scopes', async () => {
  const changeset = {
    id: 'x',
    summary: 'api: add a thing',
    releases: [{ name: 'pkg', type: 'minor' as const }],
    commit: data.commit,
  };

  await expect(
    getReleaseLine(changeset, 'minor', { repo: data.repo }),
  ).resolves.toContain('**api:** add a thing');
});
