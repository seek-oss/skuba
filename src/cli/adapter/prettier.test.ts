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
  `('inferParser($filepath) === $parser', ({ filepath, parser }) =>
    expect(inferParser(filepath)).toBe(parser),
  );
});
