import * as fs from 'node:fs';
import * as path from 'node:path';

import { parse, stringify } from 'yaml';

import { ValidationError } from './errors.js';
import { isRecord, parseJsonFile } from './util.js';

export const PNPM_LOCK = 'pnpm-lock.yaml';

export const PNPM_WORKSPACE_FILES: string[] = [
  'pnpm-workspace.yaml',
  '.npmrc',
  '.pnpmfile.cjs',
  '.pnpmfile.mjs',
];

export const PNPM_INSTALL_COMMAND: [string, ...string[]] = [
  'pnpm',
  'install',
  '--config.node-linker=hoisted',
  '--config.package-import-method=clone-or-copy',
  '--no-frozen-lockfile',
];

const isInside = (parent: string, child: string): boolean => {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};

const assertPnpm = (name: string, source: string, pkgPath: string): void => {
  if (name !== 'pnpm') {
    throw new ValidationError(
      `Unsupported package manager '${name}' declared in ${source} of ${pkgPath}. ` +
        'NodejsFunction only supports pnpm.',
    );
  }
};

export const readPackageManagerMeta = (
  projectRoot: string,
): {
  nearestPackageJson: string | undefined;
  packageManagerField: string | undefined;
} => {
  const pkgPath = path.join(projectRoot, 'package.json');
  const nearestPackageJson = fs.existsSync(pkgPath) ? pkgPath : undefined;

  if (!nearestPackageJson) {
    return { nearestPackageJson, packageManagerField: undefined };
  }

  const parsed: unknown = parseJsonFile(pkgPath);
  if (!isRecord(parsed)) {
    return { nearestPackageJson, packageManagerField: undefined };
  }

  if (isRecord(parsed.devEngines)) {
    const devEnginesPm = parsed.devEngines.packageManager;
    if (isRecord(devEnginesPm) && typeof devEnginesPm.name === 'string') {
      assertPnpm(
        devEnginesPm.name,
        'the `devEngines.packageManager` field',
        pkgPath,
      );
    }
  }

  if (typeof parsed.packageManager === 'string') {
    const m = /^([^@\s]+)@/.exec(parsed.packageManager);
    if (m) {
      assertPnpm(m[1] as string, 'the `packageManager` field', pkgPath);
      return { nearestPackageJson, packageManagerField: parsed.packageManager };
    }
  }

  return { nearestPackageJson, packageManagerField: undefined };
};

const injectIgnoreScripts = (outputDir: string): void => {
  const target = path.join(outputDir, '.npmrc');
  const existing = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  if (/^ignore-scripts\s*=/m.test(existing)) {
    return;
  }
  const sep = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
  fs.writeFileSync(target, `${existing}${sep}ignore-scripts=true\n`);
};

const copyPatchFile = (
  relativePath: string,
  projectRoot: string,
  outputDir: string,
  copiedFiles: string[],
): void => {
  const src = path.join(projectRoot, relativePath);
  const dest = path.join(outputDir, relativePath);

  if (!isInside(projectRoot, src) || !isInside(outputDir, dest)) {
    throw new ValidationError(
      `Refusing to copy pnpm patch '${relativePath}': it resolves outside the project root or output directory.`,
    );
  }
  if (!fs.existsSync(src)) {
    return;
  }

  const realSrc = fs.realpathSync(src);
  if (!isInside(fs.realpathSync(projectRoot), realSrc)) {
    throw new ValidationError(
      `Refusing to copy pnpm patch '${relativePath}': it resolves (via symlink) outside the project root.`,
    );
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(realSrc, dest);
  copiedFiles.push(dest);
};

const filterPnpmWorkspaceYaml = (
  content: string,
  nodeModules: string[],
  projectRoot: string,
  outputDir: string,
): { content: string; copiedFiles: string[] } => {
  let doc: unknown;
  try {
    doc = parse(content);
  } catch (err) {
    throw new ValidationError(
      `Failed to parse pnpm-workspace.yaml: ${(err as Error).message}`,
    );
  }

  if (!isRecord(doc) || !('patchedDependencies' in doc)) {
    return { content, copiedFiles: [] };
  }

  const patched = doc.patchedDependencies;
  const copiedFiles: string[] = [];

  if (isRecord(patched)) {
    for (const [key, value] of Object.entries(patched)) {
      const pkgName = key.replace(/(?<=.)@[^@]+$/, '');
      if (!nodeModules.includes(pkgName)) {
        delete patched[key];
      } else if (typeof value === 'string' && value) {
        copyPatchFile(value, projectRoot, outputDir, copiedFiles);
      }
    }
  }

  // Drop the key once no entries survive so an empty `patchedDependencies: {}`
  // (or a null section) is never emitted.
  if (!isRecord(patched) || Object.keys(patched).length === 0) {
    delete doc.patchedDependencies;
  }

  return { content: stringify(doc), copiedFiles };
};

export const copyWorkspaceFiles = (
  projectRoot: string,
  outputDir: string,
  nodeModules: string[] = [],
  ignoreScripts = false,
): string[] => {
  const stagedFiles: string[] = [];
  for (const file of PNPM_WORKSPACE_FILES) {
    const src = path.join(projectRoot, file);
    if (!fs.existsSync(src)) {
      continue;
    }
    const dest = path.join(outputDir, file);
    if (file === 'pnpm-workspace.yaml') {
      const content = fs.readFileSync(src, 'utf8');
      const filtered = filterPnpmWorkspaceYaml(
        content,
        nodeModules,
        projectRoot,
        outputDir,
      );
      fs.writeFileSync(dest, filtered.content);
      stagedFiles.push(...filtered.copiedFiles);
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  if (ignoreScripts) {
    injectIgnoreScripts(outputDir);
  }

  return stagedFiles;
};
