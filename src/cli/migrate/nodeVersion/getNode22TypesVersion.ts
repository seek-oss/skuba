type VersionResult = {
  version: string;
  err?: string;
};

export const getNode22TypesVersion = async (
  major: number,
  defaultVersion: string,
): Promise<VersionResult> => {
  try {
    const response = await fetch('https://registry.npmjs.org/@types/node');
    if (!response.ok)
      throw new Error(`Failed to fetch: ${response.statusText}`);

    const json = (await response.json()) as {
      versions: Record<string, unknown>;
    };
    const versions = Object.keys(json.versions)
      .filter((v) => v.startsWith(`${major}.`))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

    const latestVersion = versions[0];
    const versionRegex = /(22\.\d+\.\d+)/;

    if (!latestVersion || !versionRegex.test(latestVersion)) {
      throw new Error('No version found');
    }

    return {
      version: versionRegex.exec(latestVersion)?.[0] ?? defaultVersion,
    };
  } catch {
    return {
      version: defaultVersion,
      err: 'Failed to fetch latest version, using fallback version',
    };
  }
};
