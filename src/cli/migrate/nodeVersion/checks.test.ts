import findUp from 'find-up';
import fs from 'fs-extra';

jest.mock('find-up');
jest.mock('fs-extra');

import { log } from '../../../utils/logging';

import {
  isPatchableNodeVersion,
  isPatchableServerlessVersion,
  isPatchableSkubaType,
} from './checks';

jest.spyOn(log, 'warn');

afterEach(() => {
  jest.resetAllMocks();
});

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
    await expect(isPatchableServerlessVersion()).resolves.toBe(true);
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
    await expect(isPatchableServerlessVersion()).resolves.toBe(false);
  });
  it('should return true when serverless version is not found', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('package.json');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue(JSON.stringify({}) as never);
    await expect(isPatchableServerlessVersion()).resolves.toBe(true);
  });
  it('throws when no package.json is found', async () => {
    jest.mocked(findUp).mockResolvedValueOnce(undefined);
    await expect(isPatchableServerlessVersion()).rejects.toThrow(
      'package.json not found',
    );
  });
  it('should return an error when the package.json is not valid json', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('package.json');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue('invalid json' as never);
    await expect(isPatchableServerlessVersion()).rejects.toThrow(
      'package.json is not valid JSON',
    );
  });
});

describe('isPatchableSkubaType', () => {
  it('should return true when skuba type is not "package"', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('package.json');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue(
        JSON.stringify({
          skuba: {
            type: 'application',
          },
        }) as never,
      );
    await expect(isPatchableSkubaType()).resolves.toBe(true);
  });
  it('should return false when skuba type is "package"', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('package.json');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue(
        JSON.stringify({
          skuba: {
            type: 'package',
          },
        }) as never,
      );
    await expect(isPatchableSkubaType()).resolves.toBe(false);
  });
  it('should return true when skuba type is not found', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('package.json');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue(JSON.stringify({}) as never);
    await expect(isPatchableSkubaType()).resolves.toBe(false);
  });
});

describe('isPatchableNodeVersion', () => {
  it('should return true when the node version is supported', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue('20' as never);
    await expect(isPatchableNodeVersion(22)).resolves.toBe(true);
  });
  it('should return false when the node version is greater than the target version', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue('24' as never);
    await expect(isPatchableNodeVersion(22)).resolves.toBe(false);
  });
  it('should return false when the node version is not found', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue(null as never);
    await expect(isPatchableNodeVersion(22)).resolves.toBe(false);
  });
  it('should return false when the current node version is not a number', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue('twenty' as never);
    await expect(isPatchableNodeVersion(22)).resolves.toBe(false);
  });
  it('should return false when the target node version is invalid', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue('20' as never);
    await expect(isPatchableNodeVersion(-1)).resolves.toBe(false);
  });
  it('should return true when the node version is equal to the target version', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('.nvmrc');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue('22' as never);
    await expect(isPatchableNodeVersion(22)).resolves.toBe(true);
  });
});
