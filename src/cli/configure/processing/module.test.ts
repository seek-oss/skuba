import { replacePackageReferences } from './module';

describe('replacePackageReferences', () => {
  it.each([
    ['replaces root module import', "import '@seek/skuba';", "import 'skuba';"],
    [
      'replaces submodule import',
      "import '@seek/skuba/config/jest';",
      "import 'skuba/config/jest';",
    ],
    [
      'replaces reference to repo',
      'This project is powered by SEEK-Jobs/skuba.',
      'This project is powered by seek-oss/skuba.',
    ],
    [
      'replaces multiple occurrences',
      `'@seek/skuba' "@seek/skuba"`,
      `'skuba' "skuba"`,
    ],
    [
      'leaves "regular" usage alone',
      'I went to @seek/skuba diving lessons',
      'I went to @seek/skuba diving lessons',
    ],
  ])('%s', (_, input, expected) => {
    const process = replacePackageReferences({
      old: {
        packageName: '@seek/skuba',
        repoSlug: 'SEEK-Jobs/skuba',
      },
      new: {
        packageName: 'skuba',
        repoSlug: 'seek-oss/skuba',
      },
    });

    expect(process('filename.txt', input)).toBe(expected);
  });
});
