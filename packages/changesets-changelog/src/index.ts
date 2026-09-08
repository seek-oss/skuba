import fs from 'node:fs/promises';
import path from 'node:path';
import util from 'node:util';

import { getCommitInfo, getPullRequestInfo } from '@changesets/get-github-info';
import type { ChangelogFunctions } from '@changesets/types';

import { buildReleaseLineTokens, renderTemplate } from './render-template.js';

/**
 * Bold the scope of the changelog entry.
 *
 * This is used later in our site packaging.
 */
const boldScope = (firstLine: string) =>
  firstLine.replace(/^([^:]+): /, '**$1:** ');

const ISSUE_REF_REGEX = /\[.*?\]\(.*?\)|\B#([1-9]\d*)\b/g;

// "match what you skip, capture what you want": the left alternative
// consumes markdown links so the right alternative only matches bare refs
const linkifyIssueRefs = (
  line: string,
  { serverUrl, repo }: { serverUrl: string; repo: string },
): string =>
  line.replace(ISSUE_REF_REGEX, (match, issue: string | undefined) =>
    // PRs and issues are the same thing on GitHub (to some extent, of course)
    // this relies on GitHub redirecting from /issues/1234 to /pull/1234 when necessary
    issue ? `[#${issue}](${serverUrl}/${repo}/issues/${issue})` : match,
  );

const readEnvFile = async () => {
  const envFile = path.resolve(process.cwd(), '.env');
  try {
    const content = await fs.readFile(envFile, 'utf8');
    return util.parseEnv(content);
  } catch {
    return {};
  }
};

let cachedEnv: ReturnType<typeof readEnvFile> | undefined;

const readEnvFileCached = () => {
  cachedEnv ??= readEnvFile();
  return cachedEnv;
};

const readEnv = async () => {
  const fileEnv = await readEnvFileCached();

  const GITHUB_SERVER_URL =
    process.env.GITHUB_SERVER_URL ||
    fileEnv.GITHUB_SERVER_URL ||
    'https://github.com';
  const GITHUB_REPOSITORY =
    process.env.GITHUB_REPOSITORY || fileEnv.GITHUB_REPOSITORY;

  return { GITHUB_SERVER_URL, GITHUB_REPOSITORY };
};

const getRepo = async (options: null | Record<string, unknown>) => {
  let repo: string | undefined;
  if (options && 'repo' in options) {
    repo =
      typeof options.repo === 'string' && options.repo
        ? options.repo
        : undefined;
  } else {
    repo = (await readEnv()).GITHUB_REPOSITORY;
  }

  if (!repo) {
    throw new Error(
      'Please provide a repo to this changelog generator like this:\n"changelog": ["@skuba-lib/changesets-changelog", { "repo": "org/repo" }]\nor set the GITHUB_REPOSITORY environment variable.',
    );
  }

  return repo;
};

let hasWarnedAboutMissingToken = false;

const warnAboutMissingToken = () => {
  if (hasWarnedAboutMissingToken) {
    return;
  }

  hasWarnedAboutMissingToken = true;

  // eslint-disable-next-line no-console
  console.warn(
    'Defaulting to Git-based versioning.\nEnable GitHub-based versioning by setting the GITHUB_TOKEN environment variable.\nThis requires a GitHub personal access token with the `read:user` and `repo:status` scopes: https://github.com/settings/tokens/new?scopes=read:user,repo:status&description=changesets',
  );
};

const defaultGetReleaseLine: ChangelogFunctions['getReleaseLine'] = (
  changeset,
) => {
  const [firstLine = '', ...futureLines] = changeset.summary
    .split('\n')
    .map((l) => l.trimEnd());

  const formattedFirstLine = boldScope(firstLine);
  const suffix = changeset.commit;

  return `\n\n- ${formattedFirstLine}${
    suffix ? ` (${suffix})` : ''
  }\n${futureLines.map((l) => `  ${l}`).join('\n')}`;
};

const gitHubChangelogFunctions: ChangelogFunctions = {
  getDependencyReleaseLine: async (
    changesets,
    dependenciesUpdated,
    options,
  ) => {
    const repo = await getRepo(options);
    if (dependenciesUpdated.length === 0) {
      return '';
    }

    const changesetLink = `- Updated dependencies [${(
      await Promise.all(
        changesets.map(async (cs) => {
          if (cs.commit) {
            const info = await getCommitInfo({ commit: cs.commit, repo });
            return info?.commit.markdownLink ?? `\`${cs.commit.slice(0, 7)}\``;
          }

          return undefined;
        }),
      )
    )
      .filter((link) => link)
      .join(', ')}]:`;

    const updatedDependenciesList = dependenciesUpdated.map(
      (dependency) => ` - ${dependency.name}@${dependency.newVersion}`,
    );

    return [changesetLink, ...updatedDependenciesList].join('\n');
  },
  getReleaseLine: async (changeset, _type, options) => {
    const repo = await getRepo(options);
    const { GITHUB_SERVER_URL } = await readEnv();

    let prFromSummary: number | undefined;
    let commitFromSummary: string | undefined;
    const usersFromSummary: string[] = [];

    const replacedChangelog = changeset.summary
      .replace(
        /^\s*(?:pr|pull|pull\s+request):\s*#?(\d+)/im,
        (_, pr: string) => {
          const num = Number(pr);
          if (!Number.isNaN(num)) {
            prFromSummary = num;
          }
          return '';
        },
      )
      .replace(/^\s*commit:\s*([^\s]+)/im, (_, commit: string) => {
        commitFromSummary = commit;
        return '';
      })
      .replace(/^\s*(?:author|user):\s*@?([^\s]+)/gim, (_, user: string) => {
        usersFromSummary.push(user);
        return '';
      })
      .trim();

    const [firstLine = '', ...futureLines] = replacedChangelog
      .split('\n')
      .map((l) => l.trimEnd());

    const links: { commit?: string; pull?: string; user?: string } = {
      commit: undefined,
      pull: undefined,
      user: undefined,
    };

    if (prFromSummary != null) {
      const info = await getPullRequestInfo({ pull: prFromSummary, repo });
      links.commit = info?.commit?.markdownLink;
      links.pull = info?.pull.markdownLink;
      links.user = info?.author?.markdownLink;

      if (commitFromSummary) {
        const url = `${GITHUB_SERVER_URL}/${repo}/commit/${commitFromSummary}`;
        links.commit = `[\`${commitFromSummary.slice(0, 7)}\`](${url})`;
      }
    } else if (commitFromSummary || changeset.commit) {
      const commitToFetchFrom = commitFromSummary ?? changeset.commit;
      if (commitToFetchFrom) {
        const info = await getCommitInfo({ commit: commitToFetchFrom, repo });
        links.commit = info?.commit.markdownLink;
        links.pull = info?.pull?.markdownLink;
        links.user = info?.author?.markdownLink;
      }
    }

    let users: string | null | undefined;
    if (options?.disableThanks !== false) {
      users = null;
    } else if (usersFromSummary.length > 0) {
      users = usersFromSummary
        .map(
          (userFromSummary) =>
            `[@${userFromSummary}](${GITHUB_SERVER_URL}/${userFromSummary})`,
        )
        .join(', ');
    } else {
      users = links.user;
    }

    const linkOpts = { serverUrl: GITHUB_SERVER_URL, repo };
    const summaryLinked = linkifyIssueRefs(boldScope(firstLine), linkOpts);

    const continuation = futureLines
      .map((l) => ` ${linkifyIssueRefs(l, linkOpts)}`)
      .join('\n');

    if (typeof options?.template === 'string' && options.template.length > 0) {
      const tokens = buildReleaseLineTokens({
        summaryLinked,
        links,
        users,
      });
      // trimEnd so an empty trailing token (e.g. `{ref}` with no PR/commit)
      // leaves no dangling space - a trailing space in markdown is unsafe.
      const rendered = renderTemplate(options.template, tokens).trimEnd();
      return `${rendered}\n${continuation}`;
    }

    const prefix = [
      links.pull == null ? '' : ` ${links.pull}`,
      links.commit == null ? '' : ` ${links.commit}`,
      users == null ? '' : ` Thanks ${users}!`,
    ].join('');

    return `\n\n-${prefix ? `${prefix} -` : ''} ${summaryLinked}\n${continuation}`;
  },
};

const changelogFunctions: ChangelogFunctions = {
  getDependencyReleaseLine: async (
    changesets,
    dependenciesUpdated,
    options,
  ) => {
    if (!process.env.GITHUB_TOKEN) {
      warnAboutMissingToken();
      return '';
    }

    return gitHubChangelogFunctions.getDependencyReleaseLine(
      changesets,
      dependenciesUpdated,
      options,
    );
  },
  getReleaseLine: async (changeset, type, options) => {
    if (!process.env.GITHUB_TOKEN) {
      warnAboutMissingToken();
      return defaultGetReleaseLine(changeset, type, options);
    }

    return gitHubChangelogFunctions.getReleaseLine(changeset, type, options);
  },
};

export { changelogFunctions };
export default changelogFunctions;
