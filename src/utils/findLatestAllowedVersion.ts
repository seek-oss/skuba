import { execa } from 'execa';
import { maxSatisfying, valid } from 'semver';

export const findAllowedLatestVersion = async (
  packageName: string,
  versionRange: string,
): Promise<string | null> => {
  const [timeResult, ageResult] = await Promise.all([
    execa('pnpm', ['view', packageName, 'time', '--json'], { stdio: 'pipe' }),
    execa('pnpm', ['config', 'get', 'minimumReleaseAge'], { stdio: 'pipe' }),
  ]);

  const time = JSON.parse(timeResult.stdout) as Record<string, string>;

  const rawAge = ageResult.stdout.trim();
  const minimumReleaseAgeMinutes =
    rawAge === '' || rawAge === 'undefined' ? 0 : Number(rawAge);

  const cutoff = Date.now() - minimumReleaseAgeMinutes * 60 * 1000;

  const eligibleVersions = Object.entries(time)
    .filter(([version, publishedAt]) => {
      if (valid(version) === null) {
        return false;
      }

      return new Date(publishedAt).getTime() <= cutoff;
    })
    .map(([version]) => version);

  return maxSatisfying(eligibleVersions, versionRange);
};
