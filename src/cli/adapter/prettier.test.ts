import { inferParser } from './prettier';

describe('inferParser', () => {
  test.each`
    filepath                            | parser
    ${'/usr/local/bin/secret.json'}     | ${'json'}
    ${'C:\\Users\\Devloper\\My CV.yml'} | ${'yaml'}
    ${'CODEOWNERS'}                     | ${undefined}
    ${'client.tsx'}                     | ${'typescript'}
    ${'server.ts'}                      | ${'typescript'}
    ${'vanilla.js'}                     | ${'babel'}
  `(
    'inferParser($filepath) === $parser',
    async ({ filepath, parser }) =>
      await expect(inferParser(filepath)).resolves.toBe(parser),
  );
});
