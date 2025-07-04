import {
  isGitHubOrg,
  isGitHubRepo,
  isGitHubTeam,
  isPlatform,
} from './validation.js';

describe('isGitHubOrg', () => {
  test.each([
    ['digits', '123', true],
    ['letters', 'abc', true],
    ['dashed words', 'my-1st-org', true],
    ['underscored words', 'my_1st_org', false],
    ['dotted words', 'my.1st.org', false],
    ['double dashes', 'oh--no', false],
    ['starting dash', '-oh-no', false],
    ['ending dash', 'oh-no-', false],
    ['empty string', '', false],
  ])('%s', (_, input, expected) => expect(isGitHubOrg(input)).toBe(expected));
});

describe('isGitHubRepo', () => {
  test.each([
    ['digits', '123', true],
    ['letters', 'abc', true],
    ['dashed words', '-my-1st-repo-', true],
    ['underscored words', '_my_1st_repo_', true],
    ['dotted words', '.my.1st.repo.', true],
    ['double dashes', 'oh--no', true],
    ['empty string', '', false],
    ['current directory', '.', false],
    ['parent directory', '..', false],
  ])('%s', (_, input, expected) => expect(isGitHubRepo(input)).toBe(expected));
});

describe('isGitHubTeam', () => {
  test.each([
    ['digits', '123', true],
    ['letters', 'abc', true],
    ['dashed words', 'my-1st-team', true],
    ['underscored words', '_my_1st_team_', true],
    ['dotted words', 'my.1st.team', false],
    ['double dashes', 'oh--no', false],
    ['starting dash', '-oh-no', false],
    ['ending dash', 'oh-no-', false],
    ['empty string', '', false],
  ])('%s', (_, input, expected) => expect(isGitHubTeam(input)).toBe(expected));

  describe('isPlatform', () => {
    test.each([
      ['amd64', true],
      ['arm64', true],
      ['linux/amd64', false],
      ['linux/arm64', false],
      ['x86_64', false],
      ['', false],
      [undefined, false],
      [null, false],
      [{}, false],
      [[], false],
    ])('%p', (input, expected) => expect(isPlatform(input)).toBe(expected));
  });
});
