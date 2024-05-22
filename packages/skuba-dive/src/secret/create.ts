import {
  GetSecretValueCommand,
  type GetSecretValueCommandOutput,
  SecretsManagerClient
 } from '@aws-sdk/client-secrets-manager';

/**
 * Create a function that reads an environment variable and runs it through the
 * provided parsing function.
 */
export const create =
  <T>(parse: (commandOutput: GetSecretValueCommandOutput, name: string) => T) =>
  async <U = T>(name: string, opts?: Readonly<{ default: U }>): Promise<T | U> => {
    const client = new SecretsManagerClient();
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: name,
      }),
    );

    if (response.SecretString !== undefined || response.SecretBinary !== undefined) {
      return parse(response, name);
    }

    if (typeof opts !== 'undefined') {
      return opts.default;
    }

    throw Error(`Secret ${name} has no value`);
  };
