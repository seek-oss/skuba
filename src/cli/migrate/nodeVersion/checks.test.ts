import findUp from 'find-up';
import fs from 'fs-extra';

jest.mock('find-up');
jest.mock('fs-extra');
jest.mock('../../../config/load');

import { loadSkubaConfig } from '../../../config/load';
import { skubaConfigDefault } from '../../../config/types';
import { log } from '../../../utils/logging';

import {
  isPatchableNodeVersion,
  isPatchableServerlessVersion,
  isPatchableSkubaType,
} from './checks';

jest.spyOn(log, 'warn');

afterEach(() => {
  jest.clearAllMocks();
});

const cwd = process.cwd();

describe('isPatchableServerlessVersion', () => {
  it('resolves as a noop when serverless version is supported', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('package.json');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue(
        JSON.stringify({
          devDependencies: {
            serverless: '4.0.0',
          },
        }) as never,
      );
    await expect(isPatchableServerlessVersion(cwd)).resolves.toBe(true);
  });
  it('should return false when the serverless version is below 4', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('package.json');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue(
        JSON.stringify({
          devDependencies: {
            serverless: '3.0.0',
          },
        }) as never,
      );
    await expect(isPatchableServerlessVersion(cwd)).resolves.toBe(false);
  });
  it('should return true when serverless version is not found', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('package.json');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue(
        JSON.stringify({
          devDependencies: {
            'something/else': '3.0.0',
          },
        }) as never,
      );
    await expect(isPatchableServerlessVersion(cwd)).resolves.toBe(true);
  });
  it('should returns false when no package.json is found', async () => {
    jest.mocked(findUp).mockResolvedValueOnce(undefined);
    await expect(isPatchableServerlessVersion(cwd)).resolves.toBe(false);
  });
  it('should return an error when the package.json is not valid json', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('package.json');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue('invalid json' as never);
    await expect(isPatchableServerlessVersion(cwd)).rejects.toThrow(
      'package.json is not valid JSON',
    );
  });
});

describe('isPatchableSkubaType', () => {
  const mockAnEmptyPackageJson = () => {
    jest.mocked(findUp).mockResolvedValueOnce('package.json');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue(JSON.stringify({}) as never);
  };

  it('should return true when skuba type is not "package"', async () => {
    mockAnEmptyPackageJson();
    jest
      .mocked(loadSkubaConfig)
      .mockResolvedValue({ ...skubaConfigDefault, projectType: 'application' });
    await expect(isPatchableSkubaType(cwd)).resolves.toBe(true);
  });
  it('should return false when skuba type is "package"', async () => {
    mockAnEmptyPackageJson();
    jest
      .mocked(loadSkubaConfig)
      .mockResolvedValue({ ...skubaConfigDefault, projectType: 'package' });
    await expect(isPatchableSkubaType(cwd)).resolves.toBe(false);
  });
  it('should return false when skuba type is not found', async () => {
    mockAnEmptyPackageJson();
    jest.mocked(loadSkubaConfig).mockResolvedValue(skubaConfigDefault);
    await expect(isPatchableSkubaType(cwd)).resolves.toBe(false);
  });
  it('should return false when no package.json is not found', async () => {
    jest.mocked(findUp).mockResolvedValueOnce(undefined);
    jest
      .mocked(loadSkubaConfig)
      .mockResolvedValue({ ...skubaConfigDefault, projectType: 'application' });
    await expect(isPatchableSkubaType(cwd)).resolves.toBe(false);
  });
});

describe('isPatchableNodeVersion', () => {
  it('should return true when the node version is supported', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue('20' as never);
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(true);
  });
  it('should return false when the node version is greater than the target version', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue('24' as never);
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(false);
  });
  it('should return false when the node version is not found', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue(null as never);
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(false);
  });
  it('should return false when the current node version is not a number', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue('twenty' as never);
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(false);
  });
  it('should return false when the target node version is invalid', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue('20' as never);
    await expect(isPatchableNodeVersion(-1, cwd)).resolves.toBe(false);
  });
  it('should return true when the node version is equal to the target version', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue('22' as never);
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(true);
  });
  it('should return true when the node version is found in .node-version', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('.node-version');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue('20' as never);
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(true);
  });
  it('should return true when the node version is found in package.json engines', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('package.json');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue(
        JSON.stringify({
          engines: {
            node: '20',
          },
        }) as never,
      );
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(true);
  });
  it('should return false when the node version in package.json engines is greater than the target version', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('package.json');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue(
        JSON.stringify({
          engines: {
            node: '24',
          },
        }) as never,
      );
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(false);
  });
  it('should return false when the node version in package.json engines is invalid', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('package.json');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue(
        JSON.stringify({
          engines: {
            node: 'invalid',
          },
        }) as never,
      );
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(false);
  });
  it('should return false when no version is found in any file', async () => {
    jest.mocked(findUp).mockResolvedValueOnce(undefined);
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(false);
  });
  it('should return false when the version in .nvmrc is invalid', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue('invalid' as never);
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(false);
  });
  it('should return false when the version in .node-version is invalid', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('.node-version');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue('invalid' as never);
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(false);
  });
  it('should return false when the version in package.json engines is invalid', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('package.json');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue(
        JSON.stringify({
          engines: {
            node: 'invalid',
          },
        }) as never,
      );
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(false);
  });
  it('should return true when the version in .nvmrc and .node-version is invalid but a valid package.json engines version', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue('invalid' as never);
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(false);
    jest.mocked(findUp).mockResolvedValueOnce('package.json');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue(
        JSON.stringify({
          engines: {
            node: '>=20',
          },
        }) as never,
      );
    await expect(isPatchableNodeVersion(22, cwd)).resolves.toBe(true);
  });
});
