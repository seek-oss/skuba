import path from 'path';
import { inspect } from 'util';

import { type Edit, type SgNode, parseAsync } from '@ast-grep/napi';
import * as Git from '@skuba-lib/api/git';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const SEEK_LOGGER = '@seek/logger';

const localName = (specifier: SgNode): string | undefined => {
  const identifiers = specifier
    .children()
    .filter((child) => child.kind() === 'identifier');

  return identifiers.at(-1)?.text();
};

const patchCreateLoggerImports = (ast: SgNode): Edit[] => {
  const defaultImports = ast.findAll({
    rule: {
      kind: 'identifier',
      inside: {
        kind: 'import_clause',
      },
    },
  });

  const edits: Edit[] = [];

  for (const defaultImport of defaultImports) {
    const importClause = defaultImport.parent();
    const importStatement = importClause?.parent();

    if (!importClause || importStatement?.kind() !== 'import_statement') {
      continue;
    }

    const moduleSpecifier = importStatement
      .find({
        rule: { kind: 'string_fragment' },
      })
      ?.text();

    if (moduleSpecifier !== SEEK_LOGGER) {
      continue;
    }

    const namedImports = importClause.find({
      rule: { kind: 'named_imports' },
    });
    const namespaceImport = importClause.find({
      rule: { kind: 'namespace_import' },
    });
    const source = importStatement
      .find({
        rule: { kind: 'string' },
      })
      ?.text();

    if (!source) {
      continue;
    }

    const isTypeImport = importStatement
      .children()
      .some((child) => child.kind() === 'type');
    const typePrefix = isTypeImport ? 'type ' : '';
    const semicolon = importStatement.text().trimEnd().endsWith(';') ? ';' : '';

    const specifiers =
      namedImports?.findAll({
        rule: { kind: 'import_specifier' },
      }) ?? [];

    const defaultLocalName = defaultImport.text();
    const hasDuplicateLocal = specifiers.some(
      (specifier) => localName(specifier) === defaultLocalName,
    );

    const createLoggerSpecifier =
      defaultLocalName === 'createLogger'
        ? 'createLogger'
        : `createLogger as ${defaultLocalName}`;

    const nextSpecifiers = hasDuplicateLocal
      ? specifiers.map((specifier) => specifier.text())
      : [
          createLoggerSpecifier,
          ...specifiers.map((specifier) => specifier.text()),
        ];

    const namedClause = `{ ${nextSpecifiers.join(', ')} }`;
    const namedImport = `import ${typePrefix}${namedClause} from ${source}${semicolon}`;

    if (namespaceImport) {
      edits.push(
        importStatement.replace(
          `${namedImport}\nimport ${typePrefix}${namespaceImport.text()} from ${source}${semicolon}`,
        ),
      );
      continue;
    }

    edits.push(importStatement.replace(namedImport));
  }

  return edits;
};

export const patchSeekLoggerCreateLogger: PatchFunction = async ({
  mode,
  dir = process.cwd(),
}): Promise<PatchReturnType> => {
  const gitRoot = await Git.findRoot({ dir });
  const root = gitRoot ?? dir;

  const sourceFiles = await fg('**/*.{ts,tsx,mts,cts}', {
    cwd: root,
    ignore: ['**/.git', '**/node_modules'],
  });

  if (sourceFiles.length === 0) {
    return {
      result: 'skip',
      reason: 'no source files found',
    };
  }

  const parsedFiles = await Promise.all(
    sourceFiles.map(async (file) => {
      const fullPath = path.join(root, file);
      const content = await fs.promises.readFile(fullPath, 'utf8');

      if (!content.includes(SEEK_LOGGER)) {
        return { file: fullPath, updated: undefined };
      }

      const ast = (await parseAsync('TypeScript', content)).root();
      const edits = patchCreateLoggerImports(ast);
      const updated = edits.length ? ast.commitEdits(edits) : undefined;
      return { file: fullPath, updated };
    }),
  );

  const filesToUpdate = parsedFiles.filter(
    (file): file is { file: string; updated: string } =>
      file.updated !== undefined,
  );

  if (filesToUpdate.length === 0) {
    return {
      result: 'skip',
      reason: 'no default imports from @seek/logger',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    filesToUpdate.map(async ({ file, updated }) => {
      await fs.promises.writeFile(file, updated, 'utf8');
    }),
  );

  return {
    result: 'apply',
  };
};

export const tryPatchSeekLoggerCreateLogger: PatchFunction = async (config) => {
  try {
    return await patchSeekLoggerCreateLogger(config);
  } catch (err) {
    log.warn(
      'Failed to migrate default imports from @seek/logger to named createLogger imports',
    );
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
