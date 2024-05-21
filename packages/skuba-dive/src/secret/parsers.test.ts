import type { GetSecretValueCommandOutput } from '@aws-sdk/client-secrets-manager';

import * as parsers from './parsers';

describe('string', () => {
  it('extracts the string value', () => {
    const output: GetSecretValueCommandOutput = {
      SecretString: 'abc',
      $metadata: {},
    };
    expect(parsers.string(output, 'SECRET')).toBe('abc');
  });

  it('throws when string value is not defined', () => {
    const output: GetSecretValueCommandOutput = {
      $metadata: {},
    };
    expect(() =>
      parsers.string(output, 'SECRET'),
    ).toThrowErrorMatchingInlineSnapshot(
      `"AWS SM Secret SECRET has no string value"`,
    );
  });
});
