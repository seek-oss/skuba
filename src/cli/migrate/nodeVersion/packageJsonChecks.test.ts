import findUp from 'find-up';
import fs from 'fs-extra';

jest.mock('find-up');
jest.mock('fs-extra');

import { log } from '../../../utils/logging';

import { validServerlessVersion, validSkubaType } from './packageJsonChecks';

jest.spyOn(log, 'warn');

afterEach(() => {
  jest.resetAllMocks();
});

describe('validServerlessVersion', () => {
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
    await expect(validServerlessVersion()).resolves.toBe(true);
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
    await expect(validServerlessVersion()).resolves.toBe(false);
  });
  it('should return true when serverless version is not found', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('package.json');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue(JSON.stringify({}) as never);
    await expect(validServerlessVersion()).resolves.toBe(true);
  });
  it('throws when no package.json is found', async () => {
    jest.mocked(findUp).mockResolvedValueOnce(undefined);
    await expect(validServerlessVersion()).rejects.toThrow(
      'package.json not found',
    );
  });
});

describe('validSkubaType', () => {
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
    await expect(validSkubaType()).resolves.toBe(true);
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
    await expect(validSkubaType()).resolves.toBe(false);
  });
  it('should return true when skuba type is not found', async () => {
    jest.mocked(findUp).mockResolvedValueOnce('package.json');
    jest
      .spyOn(fs, 'readFile')
      .mockImplementation()
      .mockReturnValue(JSON.stringify({}) as never);
    await expect(validSkubaType()).resolves.toBe(true);
  });
});
