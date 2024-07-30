import path from 'path';

import fs from 'fs-extra';

import { hasNpmrcSecret } from './npmrc.js';

describe('hasNpmrcSecret', () => {
  // eslint-disable-next-line no-sync
  const templateNpmrc = fs.readFileSync(
    path.join(import.meta.dirname, '../../template/base/_.npmrc'),
    'utf-8',
  );

  it.each`
    input                                                         | result
    ${templateNpmrc}                                              | ${false}
    ${'stuff\n//registry.npmjs.org/:_authToken=not-a-real-token'} | ${true}
    ${'//localhost:1234/:_password=not-a-real-password'}          | ${true}
    ${'//localhost:5678/:_auth=something'}                        | ${true}
  `('hasNpmrcSecret($input) = $result', ({ input, result }) => {
    expect(hasNpmrcSecret(input)).toBe(result);
  });
});
