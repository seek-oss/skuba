import findUp from 'find-up';
import fs from 'fs-extra';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('find-up');
vi.mock('fs-extra');

import { log } from '../../../utils/logging.js';

import {
  isPatchableNodeVersion,
  isPatchableServerlessVersion,
  isPatchableSkubaType,
} from './checks.js';

// eslint-disable-next-line @typescript-eslint/no-empty-function
vi.spyOn(log, 'warn').mockImplementation(() => {});
// eslint-disable-next-line @typescript-eslint/no-empty-function
vi.spyOn(console, 'log').mockImplementation(() => {});

afterEach(() => {
  vi.clearAllMocks();
});

const cwd = process.cwd();

describe('isPatchableServerlessVersion', () => {
  it('resolves as a noop when serverless version is supported', async () => {
    vi.mocked(findUp).mockResolvedValueOnce('package.json');
    vi.spyOn(fs, 'readFile').mockReturnValue(
      JSON.stringify({
        devDependencies: {
          serverless: '4.0.0',
        },
      }) as never,
    );
    await expect(isPatchableServerlessVersion(cwd)).resolves.toBe(true);
  });
  it('should return false when the serverless version is below 4', async () => {
    vi.mocked(findUp).mockResolvedValueOnce('package.json');
    vi.spyOn(fs, 'readFile').mockReturnValue(
      JSON.stringify({
        devDependencies: {
          serverless: '3.0.0',
        },
      }) as never,
    );
    await expect(isPatchableServerlessVersion(cwd)).resolves.toBe(false);
  });
  it('should return true when serverless version is not found', async () => {
    vi.mocked(findUp).mockResolvedValueOnce('package.json');
    vi.spyOn(fs, 'readFile').mockReturnValue(
      JSON.stringify({
        devDependencies: {
          'something/else': '3.0.0',
        },
      }) as never,
    );
    await expect(isPatchableServerlessVersion(cwd)).resolves.toBe(true);
  });
  it('should returns false when no package.json is found', async () => {
    vi.mocked(findUp).mockResolvedValueOnce(undefined);
    await expect(isPatchableServerlessVersion(cwd)).resolves.toBe(false);
  });
  it('should return an error when the package.json is not valid json', async () => {
    vi.mocked(findUp).mockResolvedValueOnce('package.json');
    vi.spyOn(fs, 'readFile').mockReturnValue('invalid json' as never);
    await expect(isPatchableServerlessVersion(cwd)).rejects.toThrow(
      'package.json is not valid JSON',
    );
  });
});

describe('isPatchableSkubaType', () => {
  it('should return true when skuba type is not "package"', async () => {
    vi.mocked(findUp).mockResolvedValueOnce('package.json');
    vi.spyOn(fs, 'readFile').mockReturnValue(
      JSON.stringify({
        skuba: {
          type: 'application',
        },
      }) as never,
    );
    await expect(isPatchableSkubaType(cwd)).resolves.toBe(true);
  });
  it('should return false when skuba type is "package"', async () => {
    vi.mocked(findUp).mockResolvedValueOnce('package.json');
    vi.spyOn(fs, 'readFile').mockReturnValue(
      JSON.stringify({
        skuba: {
          type: 'package',
        },
      }) as never,
    );
    await expect(isPatchableSkubaType(cwd)).resolves.toBe(false);
  });
  it('should return false when skuba type is not found', async () => {
    vi.mocked(findUp).mockResolvedValueOnce('package.json');
    vi.spyOn(fs, 'readFile').mockReturnValue(
      JSON.stringify({
        skuba: {
          not_a_type: 'package',
        },
      }) as never,
    );
    await expect(isPatchableSkubaType(cwd)).resolves.toBe(false);
  });
  it('should return false when no package.json is not found', async () => {
    vi.mocked(findUp).mockResolvedValueOnce(undefined);
    await expect(isPatchableSkubaType(cwd)).resolves.toBe(false);
  });
});

describe('isPatchableNodeVersion', () => {
  it('should return true when the node version is supported', async () => {
    vi.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    vi.spyOn(fs, 'readFile').mockReturnValue('20' as never);
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(true);
  });
  it('should return false when the node version is greater than the target version', async () => {
    vi.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    vi.spyOn(fs, 'readFile').mockReturnValue('24' as never);
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(false);
  });
  it('should return false when the node version is not found', async () => {
    vi.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    vi.spyOn(fs, 'readFile').mockReturnValue(null as never);
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(false);
  });
  it('should return false when the current node version is not a number', async () => {
    vi.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    vi.spyOn(fs, 'readFile').mockReturnValue('twenty' as never);
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(false);
  });
  it('should return false when the target node version is invalid', async () => {
    vi.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    vi.spyOn(fs, 'readFile').mockReturnValue('20' as never);
    await expect(isPatchableNodeVersion(-1, cwd)).resolves.toBe(false);
  });
  it('should return true when the node version is equal to the target version', async () => {
    vi.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    vi.spyOn(fs, 'readFile').mockReturnValue('22' as never);
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(true);
  });
  it('should return true when the node version is found in .node-version', async () => {
    vi.mocked(findUp).mockResolvedValueOnce('.node-version');
    vi.spyOn(fs, 'readFile').mockReturnValue('20' as never);
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(true);
  });
  it('should return true when the node version is found in package.json engines', async () => {
    vi.mocked(findUp).mockResolvedValueOnce('package.json');
    vi.spyOn(fs, 'readFile').mockReturnValue(
      JSON.stringify({
        engines: {
          node: '20',
        },
      }) as never,
    );
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(true);
  });
  it('should return false when the node version in package.json engines is greater than the target version', async () => {
    vi.mocked(findUp).mockResolvedValueOnce('package.json');
    vi.spyOn(fs, 'readFile').mockReturnValue(
      JSON.stringify({
        engines: {
          node: '24',
        },
      }) as never,
    );
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(false);
  });
  it('should return false when the node version in package.json engines is invalid', async () => {
    vi.mocked(findUp).mockResolvedValueOnce('package.json');
    vi.spyOn(fs, 'readFile').mockReturnValue(
      JSON.stringify({
        engines: {
          node: 'invalid',
        },
      }) as never,
    );
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(false);
  });
  it('should return false when no version is found in any file', async () => {
    vi.mocked(findUp).mockResolvedValueOnce(undefined);
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(false);
  });
  it('should return false when the version in .nvmrc is invalid', async () => {
    vi.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    vi.spyOn(fs, 'readFile').mockReturnValue('invalid' as never);
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(false);
  });
  it('should return false when the version in .node-version is invalid', async () => {
    vi.mocked(findUp).mockResolvedValueOnce('.node-version');
    vi.spyOn(fs, 'readFile').mockReturnValue('invalid' as never);
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(false);
  });
  it('should return false when the version in package.json engines is invalid', async () => {
    vi.mocked(findUp).mockResolvedValueOnce('package.json');
    vi.spyOn(fs, 'readFile').mockReturnValue(
      JSON.stringify({
        engines: {
          node: 'invalid',
        },
      }) as never,
    );
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(false);
  });
  it('should return true when the version in .nvmrc and .node-version is invalid but a valid package.json engines version', async () => {
    vi.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    vi.spyOn(fs, 'readFile').mockReturnValue('invalid' as never);
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(false);
    vi.mocked(findUp).mockResolvedValueOnce('package.json');
    vi.spyOn(fs, 'readFile').mockReturnValue(
      JSON.stringify({
        engines: {
          node: '>=20',
        },
      }) as never,
    );
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(true);
  });
});
