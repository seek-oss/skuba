import {
  GetSecretValueCommand,
  type GetSecretValueCommandOutput,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { mockClient } from 'aws-sdk-client-mock';

import { create } from './create';

describe('create', () => {
  const smMock = mockClient(SecretsManagerClient);

  const parse = (commandOutput: GetSecretValueCommandOutput, _name: string) =>
    commandOutput.SecretString;

  beforeEach(() => {
    smMock.reset();
  });

  describe('with default', () => {
    it('parses the secret command', async () => {
      smMock.on(GetSecretValueCommand, { SecretId: 'SECRET' }).resolves({
        SecretString: '123',
        $metadata: {},
      });
      await expect(
        create(parse)('SECRET', { default: undefined }),
      ).resolves.toBe('123');
    });

    it('defaults on missing values', async () => {
      smMock.on(GetSecretValueCommand, { SecretId: 'SECRET' }).resolves({
        $metadata: {},
      });
      await expect(
        create(parse)('SECRET', { default: undefined }),
      ).resolves.toBeUndefined();
    });
  });

  describe('without default', () => {
    it('maps a set environment variable', async () => {
      smMock.on(GetSecretValueCommand, { SecretId: 'SECRET' }).resolves({
        SecretString: '123',
        $metadata: {},
      });
      await expect(create(parse)('SECRET')).resolves.toBe('123');
    });

    it('throws on missing values', async () => {
      smMock.on(GetSecretValueCommand, { SecretId: 'SECRET' }).resolves({
        $metadata: {},
      });
      await expect(create(parse)('SECRET')).rejects.toMatchInlineSnapshot(
        `[Error: Secret SECRET has no value]`,
      );
    });
  });
});
