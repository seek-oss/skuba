export const normaliseTemplateJson = (json: string): string =>
  json
    .replace(
      /"S3Key":"([0-9a-f]+)\.zip"/g,
      (_: string, hash: string) => `"S3Key":"${'x'.repeat(hash.length)}.zip"`,
    )
    .replace(
      /workerCurrentVersion([0-9a-zA-Z]+)"/g,
      (_: string, hash: string) =>
        `workerCurrentVersion${'x'.repeat(hash.length)}"`,
    )
    .replaceAll(
      /"Value":"\d+\.\d+\.\d+-([^"]+)"/g,
      (_: string, hash: string) =>
        `"Value": "x.x.x-${'x'.repeat(hash.length)}"`,
    )
    .replaceAll(/"Value":"v\d+\.\d+\.\d+"/g, (_: string) => '"Value": "vx.x.x"')
    .replace(
      /"DD_TAGS":"git.commit.sha:([0-9a-f]+),git.repository_url:([^\"]+)",/g,
      '',
    )
    .replaceAll(
      /(layer:Datadog-[^-]+-.+?:)\d+/g,
      (_: string, layer: string) => `${layer}x`,
    );

export const normaliseTemplate = (template: object): unknown =>
  JSON.parse(normaliseTemplateJson(JSON.stringify(template)));
