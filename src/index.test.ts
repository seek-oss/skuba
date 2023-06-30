import * as skuba from '.';

describe('skuba', () => {
  it('exports', () => {
    expect(skuba).toMatchInlineSnapshot(`
      {
        "Buildkite": {
          "annotate": [Function],
          "md": {
            "terminal": [Function],
          },
        },
        "Git": {
          "commit": [Function],
          "commitAllChanges": [Function],
          "currentBranch": [Function],
          "fastForwardBranch": [Function],
          "getChangedFiles": [Function],
          "getHeadCommitId": [Function],
          "getHeadCommitMessage": [Function],
          "getOwnerAndRepo": [Function],
          "push": [Function],
          "reset": [Function],
        },
        "GitHub": {
          "buildNameFromEnvironment": [Function],
          "createCheckRun": [Function],
          "enabledFromEnvironment": [Function],
          "getPullRequestNumber": [Function],
          "putIssueComment": [Function],
          "readFileChanges": [Function],
          "uploadAllFileChanges": [Function],
          "uploadFileChanges": [Function],
        },
        "Jest": {
          "mergePreset": [Function],
        },
        "Net": {
          "waitFor": [Function],
        },
        "SkubaConfig": {
          "assets": {
            "default": [
              "**/*.vocab/*translations.json",
            ],
          },
        },
      }
    `);
  });
});
