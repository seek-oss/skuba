import path from 'path';
import { inspect } from 'util';

import { type Edit, type SgNode, parseAsync } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import { registerAstGrepLanguages } from '../../../registerAstGrepLanguages.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

import * as Git from '@skuba-lib/api/git';

const BUILDKITE_AGENT_MOUNT =
  '/usr/bin/buildkite-agent:/usr/bin/buildkite-agent';
const MOUNT_BUILDKITE_AGENT = 'mount-buildkite-agent';
const BUILDKITE_ANNOTATIONS_COMMENT = 'Mount agent for Buildkite annotations';
const DISABLE_WRAPPED_AGENT_COMMENT = 'Disable SEEK BuildAgency';

const lineStartPos = (node: SgNode): number => {
  const { index, column } = node.range().start;
  return index - column;
};

const lineEndPos = (source: string, node: SgNode): number => {
  const { index } = node.range().end;
  return source.at(index) === '\n' ? index + 1 : index;
};

const patchDockerCompose = async (contents: string): Promise<string | null> => {
  const ast = await parseAsync('yaml', contents);

  const items = ast.root().findAll({
    rule: {
      kind: 'block_sequence_item',
      regex: BUILDKITE_AGENT_MOUNT,
    },
  });

  if (!items.length) {
    return null;
  }

  return ast.root().commitEdits(removeAgentVolumeEdits(ast.root(), contents));
};

const removeAgentVolumeEdits = (scope: SgNode, source: string): Edit[] => {
  const edits: Edit[] = [];

  const items = scope.findAll({
    rule: {
      kind: 'block_sequence_item',
      regex: BUILDKITE_AGENT_MOUNT,
    },
  });

  const comments = scope.findAll({
    rule: {
      kind: 'comment',
      regex: BUILDKITE_ANNOTATIONS_COMMENT,
    },
  });

  for (const node of [...items, ...comments]) {
    edits.push({
      startPos: lineStartPos(node),
      endPos: lineEndPos(source, node),
      insertedText: '',
    });
  }

  return edits;
};

const addMountBuildkiteAgentEdits = (
  blockMapping: SgNode,
  contents: string,
): Edit[] => {
  const options = blockMapping
    .children()
    .filter((child) => child.kind() === 'block_mapping_pair');

  const [firstOption] = options;
  const lastOption = options.at(-1);

  if (
    !firstOption ||
    !lastOption ||
    options.some(
      (option) => option.field('key')?.text() === MOUNT_BUILDKITE_AGENT,
    )
  ) {
    return [];
  }

  const indent = ' '.repeat(firstOption.range().start.column);
  const insertedText = `${indent}${MOUNT_BUILDKITE_AGENT}: true\n`;

  const successor = options.find(
    (option) => (option.field('key')?.text() ?? '') > MOUNT_BUILDKITE_AGENT,
  );

  const position = successor
    ? lineStartPos(successor)
    : lineEndPos(contents, lastOption);

  return [{ startPos: position, endPos: position, insertedText }];
};

const patchDockerPluginEdits = (plugin: SgNode, contents: string): Edit[] => {
  const blockMapping = plugin
    .field('value')
    ?.find({ rule: { kind: 'block_mapping' } });

  if (!blockMapping) {
    return [];
  }

  const options = blockMapping
    .children()
    .filter((child) => child.kind() === 'block_mapping_pair');

  const mountOption = options.find(
    (option) => option.field('key')?.text() === MOUNT_BUILDKITE_AGENT,
  );

  const edits: Edit[] = [];

  if (mountOption) {
    const value = mountOption.field('value');

    if (value?.text() === 'false') {
      const { start, end } = value.range();
      edits.push({
        startPos: start.index,
        endPos: end.index,
        insertedText: 'true',
      });

      const comment = plugin.find({
        rule: {
          kind: 'comment',
          regex: DISABLE_WRAPPED_AGENT_COMMENT,
        },
      });
      if (comment) {
        edits.push({
          startPos: lineStartPos(comment),
          endPos: lineEndPos(contents, comment),
          insertedText: '',
        });
      }
    }
  } else {
    edits.push(...addMountBuildkiteAgentEdits(blockMapping, contents));
  }

  edits.push(...removeAgentVolumeEdits(plugin, contents));

  return edits;
};

const patchPipeline = async (contents: string): Promise<string | null> => {
  const ast = await parseAsync('yaml', contents);

  const composePlugins = ast.root().findAll({
    rule: {
      kind: 'block_mapping_pair',
      has: { field: 'key', regex: '^docker-compose#' },
    },
  });

  const dockerPlugins = ast.root().findAll({
    rule: {
      kind: 'block_mapping_pair',
      has: { field: 'key', regex: '^docker#' },
    },
  });

  if (!composePlugins.length && !dockerPlugins.length) {
    return null;
  }

  const edits: Edit[] = [];

  for (const plugin of composePlugins) {
    const blockMapping = plugin
      .field('value')
      ?.find({ rule: { kind: 'block_mapping' } });

    if (blockMapping) {
      edits.push(...addMountBuildkiteAgentEdits(blockMapping, contents));
    }
  }

  for (const plugin of dockerPlugins) {
    edits.push(...patchDockerPluginEdits(plugin, contents));
  }

  if (!edits.length) {
    return null;
  }

  return ast.root().commitEdits(edits);
};

export const mountBuildkiteAgent: PatchFunction = async ({
  mode,
  dir = process.cwd(),
}): Promise<PatchReturnType> => {
  const gitRoot = await Git.findRoot({ dir });
  const root = gitRoot ?? dir;

  const [dockerComposePaths, pipelinePaths] = await Promise.all([
    fg(['**/docker-compose*.{yml,yaml}'], {
      cwd: root,
      ignore: ['**/node_modules'],
    }),
    fg(['**/.buildkite/**/*.{yml,yaml}'], {
      cwd: root,
      ignore: ['**/node_modules'],
    }),
  ]);

  if (!dockerComposePaths.length && !pipelinePaths.length) {
    return {
      result: 'skip',
      reason: 'no Docker Compose or Buildkite pipeline files found',
    };
  }

  registerAstGrepLanguages();

  const patchedFiles = (
    await Promise.all([
      ...dockerComposePaths.map(async (file) => {
        const fullPath = path.join(root, file);
        const contents = await fs.promises.readFile(fullPath, 'utf8');

        if (!contents.includes(BUILDKITE_AGENT_MOUNT)) {
          return null;
        }

        const patched = await patchDockerCompose(contents);
        return patched ? { file: fullPath, contents: patched } : null;
      }),
      ...pipelinePaths.map(async (file) => {
        const fullPath = path.join(root, file);
        const contents = await fs.promises.readFile(fullPath, 'utf8');

        if (
          !contents.includes('docker-compose#') &&
          !contents.includes('docker#')
        ) {
          return null;
        }

        const patched = await patchPipeline(contents);
        return patched ? { file: fullPath, contents: patched } : null;
      }),
    ])
  ).filter((file) => file !== null);

  if (!patchedFiles.length) {
    return {
      result: 'skip',
      reason: 'no Buildkite agent mounts to migrate',
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

export const tryMountBuildkiteAgent: PatchFunction = async (config) => {
  try {
    return await mountBuildkiteAgent(config);
  } catch (err) {
    log.warn('Failed to migrate to mount-buildkite-agent');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
