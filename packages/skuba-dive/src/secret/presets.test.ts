import {
  GetSecretValueCommand,
  type GetSecretValueCommandOutput,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { mockClient } from 'aws-sdk-client-mock';

import * as presets from './presets';

describe('presets', () => {
  const smMock = mockClient(SecretsManagerClient);

  beforeEach(() => {
    smMock.reset();
  });

  test('string', async () => {
    smMock.on(GetSecretValueCommand, {SecretId: "SECRET"}).resolves({
      SecretString: '123',
      $metadata: {},
    });
    await expect(
      presets.string('SECRET'),
    ).resolves.toBe('123');
  });

  test('binary', async () => {
    const binary = new Uint8Array([0x31, 0x32, 0x33])
    smMock.on(GetSecretValueCommand, {SecretId: "SECRET"}).resolves({
      SecretBinary: binary,
      $metadata: {},
    });
    await expect(
      presets.binary('SECRET'),
    ).resolves.toEqual(binary);
  });

});
