import findUp from 'find-up';
import fs from 'fs-extra';

jest.mock('find-up');
jest.mock('fs-extra');

import { log } from '../../../utils/logging';

import { checkServerlessVersion, checkSkubaType } from './packageJsonChecks';

jest.spyOn(log, 'warn');

afterEach(() => {
  jest.resetAllMocks();
});

describe('checkServerlessVersion', () => {
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
    await expect(checkServerlessVersion()).resolves.toBeUndefined();
  });
  it('throws when the serverless version is below 4', async () => {
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
    await expect(checkServerlessVersion()).rejects.toThrow(
      'Serverless version not supported, please upgrade to 4.x',
    );
  });
  it('resolves as a noop when serverless version is not found', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('package.json');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue(JSON.stringify({}) as never);
    await expect(checkServerlessVersion()).resolves.toBeUndefined();
  });
  it('throws when no package.json is found', async () => {
    jest.mocked(findUp).mockResolvedValueOnce(undefined);
    await expect(checkServerlessVersion()).rejects.toThrow(
      'package.json not found',
    );
  });
});

describe('checkSkubaType', () => {
  it('should return undefined when skuba type is not "package"', async () => {
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
    await expect(checkSkubaType()).resolves.toBeUndefined();
  });
  it('should throw when skuba type is "package"', async () => {
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
    await expect(checkSkubaType()).rejects.toThrow(
      'Skuba type package is not supported, packages should be updated manually to ensure major runtime depreciations are intended',
    );
  });
  it('should return undefined when skuba type is not found', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('package.json');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue(JSON.stringify({}) as never);
    await expect(checkSkubaType()).resolves.toBeUndefined();
  });
});
