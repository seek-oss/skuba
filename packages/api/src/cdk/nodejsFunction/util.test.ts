import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ValidationError } from './errors.js';
import {
  extractDependencies,
  findUp,
  isEsmFormat,
  parseJsonFile,
} from './util.js';

describe('isEsmFormat', () => {
  it.each(['esm', 'es', 'module'])(
    'returns true for ESM format %p',
    (format) => {
      expect(isEsmFormat(format)).toBe(true);
    },
  );

  it.each(['cjs', 'commonjs', 'iife', 'umd', undefined])(
    'returns false for non-ESM format %p',
    (format) => {
      expect(isEsmFormat(format)).toBe(false);
    },
  );
});

describe('findUp', () => {
  it('finds package.json walking up from src/', () => {
    const result = findUp('package.json', path.join(process.cwd(), 'src'));
    expect(result).toBeDefined();
    expect(result!.endsWith('package.json')).toBe(true);
  });

  it('returns undefined when file does not exist', () => {
    const result = findUp('__nonexistent_xyzzy__.json');
    expect(result).toBeUndefined();
  });
});

describe('parseJsonFile', () => {
  const tmpJsonPath = path.join(process.cwd(), '__test_parse__.json');

  afterEach(() => {
    if (fs.existsSync(tmpJsonPath)) {
      fs.unlinkSync(tmpJsonPath);
    }
  });

  it('returns the parsed value for valid JSON', () => {
    fs.writeFileSync(tmpJsonPath, JSON.stringify({ a: 1 }));
    expect(parseJsonFile(tmpJsonPath)).toEqual({ a: 1 });
  });

  it('throws ValidationError for malformed JSON', () => {
    fs.writeFileSync(tmpJsonPath, 'not-json{');
    expect(() => parseJsonFile(tmpJsonPath)).toThrow(ValidationError);
  });
});

describe('extractDependencies', () => {
  let tmpDir: string;
  let tmpPkgPath: string;

  const installModule = (name: string, pkgJson: unknown) => {
    const modDir = path.join(tmpDir, 'node_modules', ...name.split('/'));
    fs.mkdirSync(modDir, { recursive: true });
    fs.writeFileSync(
      path.join(modDir, 'package.json'),
      JSON.stringify(pkgJson),
    );
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'extract-deps-'));
    tmpPkgPath = path.join(tmpDir, 'package.json');
    fs.writeFileSync(tmpPkgPath, JSON.stringify({ dependencies: {} }));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('resolves the concrete installed version', () => {
    installModule('pino', { name: 'pino', version: '9.5.0' });

    const result = extractDependencies(tmpPkgPath, ['pino']);
    expect(result.pino).toBe('9.5.0');
  });

  it('resolves versions for multiple modules', () => {
    installModule('pino', { name: 'pino', version: '9.5.0' });
    installModule('lodash', { name: 'lodash', version: '4.17.21' });

    const result = extractDependencies(tmpPkgPath, ['pino', 'lodash']);
    expect(result).toEqual({ pino: '9.5.0', lodash: '4.17.21' });
  });

  it('throws ValidationError when a module cannot be resolved', () => {
    expect(() =>
      extractDependencies(tmpPkgPath, ['__nonexistent_module__']),
    ).toThrow(ValidationError);
  });

  it('throws ValidationError when the resolved version is not a string', () => {
    installModule('fake-non-string-ver', { version: 42 });

    expect(() =>
      extractDependencies(tmpPkgPath, ['fake-non-string-ver']),
    ).toThrow(ValidationError);
  });

  it('throws ValidationError when the resolved version is an empty string', () => {
    installModule('fake-empty-ver', { name: 'fake-empty-ver', version: '  ' });

    expect(() => extractDependencies(tmpPkgPath, ['fake-empty-ver'])).toThrow(
      ValidationError,
    );
  });
});
