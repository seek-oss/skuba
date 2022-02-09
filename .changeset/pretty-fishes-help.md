---
"skuba": patch
---

deps: semantic-release ^19.0.0

Resolves [SNYK-JS-MARKED-2342073](https://app.snyk.io/vuln/SNYK-JS-MARKED-2342073) and [SNYK-JS-MARKED-2342082](https://app.snyk.io/vuln/SNYK-JS-MARKED-2342082).

This may alleviate the following `skuba release` error:

```console
[semantic-release] › ✖  EGHNOPERMISSION The GitHub token doesn't allow to push on the repository owner/repo.
The user associated with the GitHub token (https://github.com/semantic-release/github/blob/master/README.md#github-authentication) configured in the GH_TOKEN or GITHUB_TOKEN environment variable must allows to push to the repository owner/repo.
```
