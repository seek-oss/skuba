const {
  getInfo,
  getInfoFromPullRequest,
} = require('@changesets/get-github-info');

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
  getDependencyReleaseLine: async (_changesets, _dependenciesUpdated) => {
    return '';
  },
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
  ) => {
    return '';
  },
  getReleaseLine: async (changeset, _type, options) => {
    if (!options || !options.repo) {
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
        let num = Number(pr);
        if (!isNaN(num)) prFromSummary = num;
        return '';
      })
      .replace(/^\s*commit:\s*([^\s]+)/im, (_, commit) => {
        commitFromSummary = commit;
        return '';
      })
      .replace(/^\s*(?:author|user):\s*@?([^\s]+)/gim, (_, user) => {
        usersFromSummary.push(user);
        return '';
      })
      .trim();

    const [firstLine, ...futureLines] = replacedChangelog
      .split('\n')
      .map((l) => l.trimRight());

    const links = await (async () => {
      if (prFromSummary !== undefined) {
        let { links } = await getInfoFromPullRequest({
          repo: options.repo,
          pull: prFromSummary,
        });
        if (commitFromSummary) {
          links = {
            ...links,
            commit: `[\`${commitFromSummary}\`](https://github.com/${options.repo}/commit/${commitFromSummary})`,
          };
        }
        return links;
      }
      const commitToFetchFrom = commitFromSummary || changeset.commit;
      if (commitToFetchFrom) {
        let { links } = await getInfo({
          repo: options.repo,
          commit: commitToFetchFrom,
        });
        return links;
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

if (process.env.GITHUB_TOKEN) {
  module.exports = gitHubChangelogFunctions;
} else {
  console.warn(
    `Defaulting to Git-based versioning.
Enable GitHub-based versioning by setting the GITHUB_TOKEN environment variable.
This requires a GitHub personal access token with the \`public_repo\` scope: https://github.com/settings/tokens/new`,
  );

  module.exports = defaultChangelogFunctions;
}
