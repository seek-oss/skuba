/* eslint-disable no-console */

import path from 'path';

import fs from 'fs-extra';
import semver from 'semver';

import {
  TEMPLATE_DOCUMENTATION_CONFIG,
  TEMPLATE_NAMES,
} from '../src/utils/template';

const SCOPE_REGEX = /\*\*([^:]+):\*\* /;

const commitLink = (commit: string) =>
  `[\`${commit}\`](https://github.com/seek-oss/skuba/commit/${encodeURIComponent(
    commit,
  )})`;

const versionLink = (version: string) =>
  `[${version}](https://github.com/seek-oss/skuba/releases/tag/v${encodeURIComponent(
    version,
  )})`;

/**
 * Ensures that our template constant matches the `/template` directory.
 */
const ensureTemplateConsistency = async (root: string) => {
  const templatesInCode = TEMPLATE_NAMES;
  const templateSetInCode = new Set<string>(templatesInCode);

  const templatesOnDisk = (
    await fs.promises.readdir(path.join(root, 'template'))
  ).filter((filename) => filename !== 'base');
  const templateSetOnDisk = new Set(templatesOnDisk);

  for (const templateName of TEMPLATE_NAMES) {
    if (!templateSetOnDisk.has(templateName)) {
      console.error(
        'Template',
        templateName,
        'is defined in code but missing on disk.',
      );
      process.exitCode = 1;
    }
  }

  for (const templateName of templatesInCode) {
    if (!templateSetOnDisk.has(templateName)) {
      console.error(
        'Template',
        templateName,
        'is defined in code but missing on disk.',
      );
      process.exitCode = 1;
    }
  }

  for (const templateName of templatesOnDisk) {
    if (!templateSetInCode.has(templateName)) {
      console.error(
        'Template',
        templateName,
        'is defined on disk but missing in code.',
      );
      process.exitCode = 1;
    }
  }
};

/**
 * Modifies the changelog header to work better with Just the Docs.
 *
 * This is JIT-executed because Changesets doesn't like us mucking with the
 * actual committed `CHANGELOG.md` source.
 */
const processChangelogHeader = (changelog: string) =>
  changelog.replace(
    /^# skuba/,
    `
---
nav_order: 98
---

# Changelog

---
`.trim(),
  );

/**
 * Modifies the readme header to work better with Just the Docs.
 *
 * This is JIT-executed to hide the frontmatter from GitHub's Markdown renderer.
 */
const processReadmeHeader = (readme: string) =>
  [
    `
---
nav_order: 1
title: 🤿
---
`.trim(),
    readme,
  ].join('\n\n');

/**
 * Compiles changelog entries for each template for rendering on our
 * documentation site.
 */
const compileChangesByTemplate = (changelog: string) => {
  const changesByTemplate: Record<string, string[]> = Object.fromEntries(
    TEMPLATE_NAMES.map((template) => [template, []]),
  );

  const sections = changelog
    // Split by version, which is denoted by a `h2`.
    .split('\n## ')
    // Skip the `h1` in the first section.
    .slice(1);

  for (const section of sections) {
    const split = section.indexOf('\n');

    const version = section.slice(0, split);

    const linesAfterVersion = section.slice(split).split('\n');

    // We may have a preamble that summarises the version.
    // After this, h3s should exist to denote major/minor/patch changes.
    const postPreambleIndex = linesAfterVersion.findIndex((line) =>
      line.startsWith('### '),
    );

    const entries = linesAfterVersion
      .slice(postPreambleIndex)
      // Filter out headings, such as those denoting major/minor/patch.
      // Our templates aren't semantically versioned so these don't matter.
      .filter((line) => !line.startsWith('#'))
      .join('\n')
      // Split by list item prefix, which denotes a new changelog entry.
      .split(/\n[\*-] /)
      .map((entry) => entry.trim())
      .filter(Boolean);

    for (const entry of entries) {
      const scope = SCOPE_REGEX.exec(entry)?.[1];

      if (!scope) {
        // Changelog entry is bad. Consider fixing this at the source.
        console.error('Changelog entry is missing a scope:', entry);
        process.exitCode = 1;
        continue;
      }

      if (!scope.startsWith('template')) {
        // Changelog entry relates to something other than a template.
        continue;
      }

      const templateMatcher = new RegExp(
        scope
          .replace(
            // Strip out the template prefix.
            /^template\/?/,
            '',
          )
          .replace(
            // Handle scopes like `*-npm-package` and `lambda-sqs-worker*`.
            // Note that this is a subset matcher so the latter is redundant.
            /\\\*/g,
            '.*',
          ),
      );

      for (const templateName of TEMPLATE_NAMES) {
        const { added } = TEMPLATE_DOCUMENTATION_CONFIG[templateName];
        const changes = changesByTemplate[templateName];

        // Note that the changeset entry applies to the template if it existed
        // as of this version and the scope is a match.
        if (
          semver.gt(version, added) &&
          templateMatcher.test(templateName) &&
          changes
        ) {
          changes.push(
            `- ${versionLink(version)}: ${entry
              // Strip out the scope as it is needlessly repetitive here.
              .replace(SCOPE_REGEX, '')
              // Auto-link a short commit hash like `1234567: ` to GitHub.
              .replace(
                /^([0-9a-f]{7,}): /,
                (_, commit: string) => `${commitLink(commit)}: `,
              )
              // Auto-link a short commit hash like `(1234567)` to GitHub.
              .replace(
                /\(([0-9a-f]{7,})\)/,
                (_, commit: string) => `(${commitLink(commit)})`,
              )}`,
          );
        }
      }
    }
  }

  return changesByTemplate;
};

const main = async () => {
  const root = path.join(__dirname, '..');

  await ensureTemplateConsistency(root);

  process.chdir(root);

  await fs.promises.rm('dist-docs', { force: true, recursive: true });

  await fs.promises.mkdir('dist-docs', { recursive: true });

  const changelog = await fs.promises.readFile('CHANGELOG.md', 'utf8');
  const readme = await fs.promises.readFile('README.md', 'utf8');

  const siteChangelog = processChangelogHeader(changelog);
  const siteReadme = processReadmeHeader(readme);

  await Promise.all([
    fs.promises.writeFile(
      path.join('dist-docs', 'CHANGELOG.md'),
      siteChangelog,
    ),
    fs.promises.writeFile(path.join('dist-docs', 'index.md'), siteReadme),
    fs.promises.copyFile(
      'CONTRIBUTING.md',
      path.join('dist-docs', 'CONTRIBUTING.md'),
    ),
    // `fs.promises.cp` is still experimental in Node.js 20.
    fs.copy('site', 'dist-docs'),
    fs.copy('docs', path.join('dist-docs', 'docs')),
  ]);

  const templateChanges = compileChangesByTemplate(changelog);

  // Run serially to avoid clobbering files that house multiple templates.
  for (const templateName of TEMPLATE_NAMES) {
    const changes = templateChanges[templateName];

    if (!changes) {
      continue;
    }

    if (!changes.length) {
      // Add a friendly placeholder if the template is fresh out of the oven.
      changes.push("🍞 There's nothing here yet.");
    }

    const config = TEMPLATE_DOCUMENTATION_CONFIG[templateName];

    const filepath = path.join(
      'dist-docs',
      'docs',
      'templates',
      config.filename,
    );

    const input = await fs.promises.readFile(filepath, 'utf8');

    const templateHeading = `## ${templateName}`;

    // Find the start of the section for this template.
    const templateHeadingIndex = input.indexOf(templateHeading);

    if (templateHeadingIndex === -1) {
      console.error(filepath, `Could not locate \`${templateHeading}\`.`);
      process.exitCode = 1;
      continue;
    }

    // Find the end of the section as denoted by a `View on GitHub` link.
    const viewOnGitHubIndex = input.indexOf(
      'View on GitHub',
      templateHeadingIndex,
    );

    if (viewOnGitHubIndex === -1) {
      console.error(
        filepath,
        `Could not locate \`View on GitHub\` line within \`${templateHeading}\`.`,
      );
      process.exitCode = 1;
      continue;
    }

    // Find the line after the `View on GitHub` link.
    const changelogIndex = 1 + input.indexOf('\n', viewOnGitHubIndex);

    // Insert the changelog inside of a collapsed `details` element.
    const output = `
${input.slice(0, changelogIndex)}

Added in ${versionLink(config.added)}

<details markdown="block">
  <summary>
    Changelog
  </summary>
  {: .text-delta }

${changes.join('\n\n')}

</details>

${input.slice(changelogIndex + 1)}`.trimStart();

    await fs.promises.writeFile(filepath, output);
  }
};

main().catch((err) => {
  throw err;
});
