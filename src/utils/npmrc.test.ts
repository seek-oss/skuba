import path from 'path';

import fs from 'fs-extra';
import { describe, expect, it } from 'vitest';

import { hasNpmrcSecret } from './npmrc.js';

describe('hasNpmrcSecret', () => {
  // eslint-disable-next-line no-sync
  const legacyTemplateNpmrc = fs.readFileSync(
    path.join(import.meta.dirname, 'legacyNpmrcForTest.npmrc'),
    'utf-8',
  );

  it.each`
    input                                                         | result
    ${legacyTemplateNpmrc}                                        | ${false}
    ${'stuff\n//registry.npmjs.org/:_authToken=not-a-real-token'} | ${true}
    ${'//localhost:1234/:_password=not-a-real-password'}          | ${true}
    ${'//localhost:5678/:_auth=something'}                        | ${true}
  `('hasNpmrcSecret($input) = $result', ({ input, result }) => {
    expect(hasNpmrcSecret(input)).toBe(result);
  });
});
