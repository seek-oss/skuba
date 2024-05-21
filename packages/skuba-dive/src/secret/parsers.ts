import type { GetSecretValueCommandOutput } from '@aws-sdk/client-secrets-manager';

export const string = (input: GetSecretValueCommandOutput, name: string): string => {
  if (!input.SecretString) {
    throw Error(`AWS SM Secret ${name} has no string value`);
  }

  return input.SecretString;
};

export const binary = (input: GetSecretValueCommandOutput, name: string): Uint8Array => {
  if (!input.SecretBinary) {
    throw Error(`AWS SM Secret ${name} has no binary value`);
  }

  return input.SecretBinary;
};