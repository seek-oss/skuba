import path from 'path';
import { inspect } from 'util';

import { type Edit, parseAsync } from '@ast-grep/napi';
import * as Git from '@skuba-lib/api/git';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const GLOB_IGNORE = ['**/.git', '**/node_modules'];

const SOURCE_FILE_GLOB = '**/*.{ts,tsx,mts,cts}';

const IMPORT_ORDER_RULES = new Set(['import-x/order', 'import/order']);

type EslintDirective =
  | 'disable-next-line'
  | 'disable-line'
  | 'disable'
  | 'enable';

const ESLINT_DIRECTIVES = new Set<string>([
  'disable-next-line',
  'disable-line',
  'disable',
  'enable',
]);

const isEslintDirective = (token: string): token is EslintDirective =>
  ESLINT_DIRECTIVES.has(token);

type ParsedEslintDisableComment = {
  style: 'line' | 'block';
  directive: EslintDirective;
  rules: string[];
  reason: string | undefined;
};

const isImportOrderRule = (rule: string): boolean =>
  IMPORT_ORDER_RULES.has(rule);

const parseCommentFrame = (
  commentText: string,
): { style: 'line' | 'block'; body: string } | null => {
  const trimmed = commentText.trim();

  if (trimmed.startsWith('/*') && trimmed.endsWith('*/')) {
    return { style: 'block', body: trimmed.slice(2, -2).trim() };
  }

  if (trimmed.startsWith('//')) {
    return { style: 'line', body: trimmed.slice(2).trim() };
  }

  return null;
};

const parseEslintDisableComment = (
  commentText: string,
): ParsedEslintDisableComment | null => {
  const frame = parseCommentFrame(commentText);
  if (!frame) {
    return null;
  }

  if (!frame.body.startsWith('eslint-')) {
    return null;
  }

  const afterPrefix = frame.body.slice('eslint-'.length);
  const separatorIndex = afterPrefix.search(/\s/);
  const directiveToken =
    separatorIndex === -1 ? afterPrefix : afterPrefix.slice(0, separatorIndex);

  if (!isEslintDirective(directiveToken)) {
    return null;
  }

  const rest =
    separatorIndex === -1 ? '' : afterPrefix.slice(separatorIndex).trim();

  let rulesPart = rest;
  let reason: string | undefined;
  const reasonIndex = rest.indexOf('--');
  if (reasonIndex !== -1) {
    rulesPart = rest.slice(0, reasonIndex).trim();
    reason = rest.slice(reasonIndex + 2).trim() || undefined;
  }

  const rules = rulesPart
    ? rulesPart
        .split(',')
        .map((rule) => rule.trim())
        .filter(Boolean)
    : [];

  return {
    style: frame.style,
    directive: directiveToken,
    rules,
    reason,
  };
};

const formatComment = (style: 'line' | 'block', body: string): string =>
  style === 'block' ? `/* ${body} */` : `// ${body}`;

const formatOxfmtIgnore = (style: 'line' | 'block'): string =>
  formatComment(style, 'oxfmt-ignore');

const formatReasonComment = (style: 'line' | 'block', reason: string): string =>
  formatComment(style, reason);

const formatEslintComment = (
  parsed: ParsedEslintDisableComment,
  rules: string[],
): string => {
  const directive = `eslint-${parsed.directive}`;
  const rulesPart = rules.join(', ');
  const reasonPart = parsed.reason ? ` -- ${parsed.reason}` : '';
  const body = rulesPart
    ? `${directive} ${rulesPart}${reasonPart}`
    : `${directive}${reasonPart}`;

  return formatComment(parsed.style, body);
};

const rewriteNextLine = (
  parsed: ParsedEslintDisableComment,
  remainingRules: string[],
): string => {
  const oxfmtIgnore = formatOxfmtIgnore(parsed.style);

  if (remainingRules.length > 0) {
    return `${oxfmtIgnore}\n${formatEslintComment(parsed, remainingRules)}`;
  }

  if (parsed.reason) {
    return `${formatReasonComment(parsed.style, parsed.reason)}\n${oxfmtIgnore}`;
  }

  return oxfmtIgnore;
};

const rewriteDisableLine = (
  parsed: ParsedEslintDisableComment,
  remainingRules: string[],
): string => {
  if (remainingRules.length > 0) {
    return `/* oxfmt-ignore */ ${formatEslintComment(parsed, remainingRules)}`;
  }

  return formatOxfmtIgnore(parsed.style);
};

const rewriteFileLevel = (
  parsed: ParsedEslintDisableComment,
  remainingRules: string[],
): string => {
  if (remainingRules.length === 0) {
    return '';
  }

  return formatEslintComment(parsed, remainingRules);
};

/**
 * Rewrites a single ESLint disable/enable comment that mentions `import-x/order`
 * or legacy `import/order`. Returns `null` when the comment should be left
 * unchanged, or a replacement string (possibly empty to delete the comment).
 */
export const rewriteImportOrderDisableComment = (
  commentText: string,
): string | null => {
  const parsed = parseEslintDisableComment(commentText);
  if (!parsed) {
    return null;
  }

  const remainingRules = parsed.rules.filter(
    (rule) => !isImportOrderRule(rule),
  );

  if (remainingRules.length === parsed.rules.length) {
    return null;
  }

  switch (parsed.directive) {
    case 'disable-next-line':
      return rewriteNextLine(parsed, remainingRules);
    case 'disable-line':
      return rewriteDisableLine(parsed, remainingRules);
    case 'disable':
    case 'enable':
      return rewriteFileLevel(parsed, remainingRules);
  }
};

export const rewriteFileImportOrderEslintDisables = async (
  contents: string,
): Promise<string> => {
  if (
    !contents.includes('import-x/order') &&
    !contents.includes('import/order')
  ) {
    return contents;
  }

  const astRoot = (await parseAsync('TypeScript', contents)).root();
  const comments = astRoot.findAll({
    rule: {
      kind: 'comment',
    },
  });

  const edits: Edit[] = [];

  for (const comment of comments) {
    const replacement = rewriteImportOrderDisableComment(comment.text());
    if (replacement === null) {
      continue;
    }

    // Indentation of any added line is left to the Oxfmt run that follows.
    edits.push(comment.replace(replacement));
  }

  if (edits.length === 0) {
    return contents;
  }

  return astRoot.commitEdits(edits);
};

const patchFile = async (contents: string): Promise<string | null> => {
  try {
    const patched = await rewriteFileImportOrderEslintDisables(contents);

    return patched === contents ? null : patched;
  } catch {
    return null;
  }
};

export const migrateImportOrderEslintDisables: PatchFunction = async ({
  mode,
  dir = process.cwd(),
}): Promise<PatchReturnType> => {
  const root = (await Git.findRoot({ dir })) ?? dir;

  const sourceFilePaths = await fg([SOURCE_FILE_GLOB], {
    cwd: root,
    ignore: GLOB_IGNORE,
  });

  if (sourceFilePaths.length === 0) {
    return {
      result: 'skip',
      reason: 'no JavaScript or TypeScript files found',
    };
  }

  const patchedFiles = (
    await Promise.all(
      sourceFilePaths.map(async (relativePath) => {
        const file = path.join(root, relativePath);
        const contents = await fs.promises.readFile(file, 'utf8');
        const patched = await patchFile(contents);

        return patched === null ? null : { file, contents: patched };
      }),
    )
  ).filter((file) => file !== null);

  if (patchedFiles.length === 0) {
    return {
      result: 'skip',
      reason: 'no import-x/order ESLint disables to replace',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    patchedFiles.map(async ({ file, contents }) => {
      await fs.promises.writeFile(file, contents, 'utf8');
    }),
  );

  return {
    result: 'apply',
  };
};

export const tryMigrateImportOrderEslintDisables: PatchFunction = async (
  config,
) => {
  try {
    return await migrateImportOrderEslintDisables(config);
  } catch (err) {
    log.warn(
      'Failed to replace import-x/order ESLint disables with oxfmt-ignore',
    );
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
