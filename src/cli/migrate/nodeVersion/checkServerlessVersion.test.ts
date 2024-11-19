import findUp from 'find-up';
import fs from 'fs-extra';

jest.mock('find-up');
jest.mock('fs-extra');

import { log } from '../../../utils/logging';

import { checkServerlessVersion } from './checkServerlessVersion';

jest.spyOn(log, 'warn');

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
    await checkServerlessVersion();
    expect(log.warn).not.toHaveBeenCalled();
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
    await checkServerlessVersion();
    expect(log.warn).not.toHaveBeenCalled();
  });
  it('throws when no package.json is found', async () => {
    jest.mocked(findUp).mockResolvedValueOnce(undefined);
    await expect(checkServerlessVersion()).rejects.toThrow(
      'package.json not found',
    );
  });
});
