import path from 'path';
import { inspect } from 'util';

import {
  type Edit,
  type NapiConfig,
  type SgNode,
  parseAsync,
} from '@ast-grep/napi';
import * as Git from '@skuba-lib/api/git';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const FUNCTION_NAME = 'agentFromApp';

const AGENT_PATTERN = '$REQUEST.agent($APP.callback())';

const HAS_FUNCTION_NAME = {
  field: 'name',
  regex: `^${FUNCTION_NAME}$`,
};

const AGENT_FROM_APP_RULE: NapiConfig = {
  rule: {
    any: [
      { kind: 'function_declaration', has: HAS_FUNCTION_NAME },
      {
        any: [{ kind: 'arrow_function' }, { kind: 'function_expression' }],
        inside: {
          kind: 'variable_declarator',
          field: 'value',
          has: HAS_FUNCTION_NAME,
        },
      },
    ],
    has: { pattern: AGENT_PATTERN, stopBy: 'end' },
  },
};

const patchAgentFromAppFunction = (fn: SgNode): Edit[] => {
  const body = fn.field('body');

  if (!body) {
    return [];
  }

  const calls = body.findAll({ rule: { pattern: AGENT_PATTERN } });

  return calls.flatMap((call) => {
    const request = call.getMatch('REQUEST')?.text();
    const app = call.getMatch('APP')?.text();

    if (!request || !app) {
      return [];
    }

    const statements = `const server = createServer(${app}.callback()).listen(0, '127.0.0.1');

afterAll(() => {
server.close();
});

return ${request}.agent(server);`;

    if (call.range().start.index === body.range().start.index) {
      return [body.replace(`{\n${statements}\n}`)];
    }

    const parent = call.parent();

    if (parent?.kind() !== 'return_statement') {
      return [];
    }

    return [parent.replace(statements)];
  });
};

const IMPORTS = `import { createServer } from 'http';
import { afterAll } from 'vitest';

`;

const addImports = (ast: SgNode): Edit => {
  const start =
    ast.find({ rule: { kind: 'import_statement' } })?.range().start.index ?? 0;

  return { startPos: start, endPos: start, insertedText: IMPORTS };
};

const patchFile = async (content: string): Promise<string | undefined> => {
  const ast = (await parseAsync('TypeScript', content)).root();
  const fn = ast.find(AGENT_FROM_APP_RULE);

  if (!fn) {
    return;
  }

  const edits = patchAgentFromAppFunction(fn);

  if (edits.length === 0) {
    return;
  }

  return ast.commitEdits([...edits, addImports(ast)]);
};

export const patchAgentFromAppServer: PatchFunction = async ({
  mode,
  dir = process.cwd(),
}): Promise<PatchReturnType> => {
  const gitRoot = await Git.findRoot({ dir });
  const root = gitRoot ?? dir;

  const sourceFiles = await fg('**/*.ts', {
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

      if (!content.includes(FUNCTION_NAME)) {
        return { file: fullPath, updated: undefined };
      }

      return { file: fullPath, updated: await patchFile(content) };
    }),
  );

  const filesToUpdate = parsedFiles.filter(
    (file): file is { file: string; updated: string } =>
      file.updated !== undefined,
  );

  if (filesToUpdate.length === 0) {
    return {
      result: 'skip',
      reason: 'no agentFromApp functions to migrate',
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

export const tryPatchAgentFromAppServer: PatchFunction = async (config) => {
  try {
    return await patchAgentFromAppServer(config);
  } catch (err) {
    log.warn('Failed to migrate agentFromApp to a listening HTTP server');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
