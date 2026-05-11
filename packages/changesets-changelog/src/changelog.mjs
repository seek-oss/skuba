import { getInfo, getInfoFromPullRequest } from '@changesets/get-github-info';

/**
 * Bold the scope of the changelog entry.
 *
 * This is used later in our site packaging.
 *
 * @param {string} firstLine
 */
const boldScope = (firstLine) => firstLine.replace(/^([^:]+): /, '**$1:** ');

/**
 * Adapted from `@changesets/cli`.
 *
 * {@link https://github.com/atlassian/changesets/blob/%40changesets/cli%402.17.0/packages/cli/src/changelog/index.ts}
 *
 * @type import('@changesets/types').ChangelogFunctions
 */
const defaultChangelogFunctions = {
  getDependencyReleaseLine: async (_changesets, _dependenciesUpdated) => '',
  getReleaseLine: async (changeset) => {
    const [firstLine, ...futureLines] = changeset.summary
      .split('\n')
      .map((l) => l.trimRight());

    const formattedFirstLine = boldScope(firstLine);

    const suffix = changeset.commit;

    return `\n\n- ${formattedFirstLine}${
      suffix ? ` (${suffix})` : ''
    }\n${futureLines.map((l) => `  ${l}`).join('\n')}`;
  },
};

/**
 * Adapted from `@changesets/changelog-github`.
 *
 * {@link https://github.com/atlassian/changesets/blob/%40changesets/changelog-github%400.4.1/packages/changelog-github/src/index.ts}
 *
 * @type import('@changesets/types').ChangelogFunctions
 */
const gitHubChangelogFunctions = {
  getDependencyReleaseLine: async (
    _changesets,
    _dependenciesUpdated,
    _options,
  ) => '',
  getReleaseLine: async (changeset, _type, options) => {
    if (!options?.repo) {
      throw new Error(
        'Please provide a repo to this changelog generator like this:\n"changelog": ["./changelog.js", { "repo": "org/repo" }]',
      );
    }

    /** @type number | undefined */
    let prFromSummary;
    /** @type string | undefined */
    let commitFromSummary;

    const replacedChangelog = changeset.summary
      .replace(/^\s*(?:pr|pull|pull\s+request):\s*#?(\d+)/im, (_, pr) => {
        const num = Number(pr);
        if (!isNaN(num)) {
          prFromSummary = num;
        }
        return '';
      })
      .replace(/^\s*commit:\s*([^\s]+)/im, (_, commit) => {
        commitFromSummary = commit;
        return '';
      })
      .replace(/^\s*(?:author|user):\s*@?([^\s]+)/gim, () => '')
      .trim();

    const [firstLine, ...futureLines] = replacedChangelog
      .split('\n')
      .map((l) => l.trimRight());

    const links = await (async () => {
      if (prFromSummary !== undefined) {
        let { links: prLinks } = await getInfoFromPullRequest({
          repo: options.repo,
          pull: prFromSummary,
        });
        if (commitFromSummary) {
          prLinks = {
            ...prLinks,
            commit: `[\`${commitFromSummary}\`](https://github.com/${options.repo}/commit/${commitFromSummary})`,
          };
        }
        return prLinks;
      }
      const commitToFetchFrom = commitFromSummary || changeset.commit;
      if (commitToFetchFrom) {
        const { links: commitLinks } = await getInfo({
          repo: options.repo,
          commit: commitToFetchFrom,
        });
        return commitLinks;
      }
      return {
        commit: null,
        pull: null,
        user: null,
      };
    })();

    const formattedFirstLine = boldScope(firstLine);

    const suffix = links.pull ?? links.commit;

    return [
      `\n- ${formattedFirstLine}${suffix ? ` (${suffix})` : ''}`,
      ...futureLines.map((l) => `  ${l}`),
    ].join('\n');
  },
};

const changelogFunctions = (() => {
  if (process.env.GITHUB_TOKEN) {
    return gitHubChangelogFunctions;
  }

  // eslint-disable-next-line no-console
  console.warn(
    'Defaulting to Git-based versioning.\nEnable GitHub-based versioning by setting the GITHUB_TOKEN environment variable.\nThis requires a GitHub personal access token with the `public_repo` scope: https://github.com/settings/tokens/new',
  );

  return defaultChangelogFunctions;
})();

export default changelogFunctions;

/* istanbul ignore next: temp test please remove */
void null;
