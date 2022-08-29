---
'skuba': patch
---

template/\*-npm-package: Use SSH scheme in repository URL

We have changed the `package.json#repository/url` format from `git+https://github.com/org/repo.git` to `git+ssh://git@github.com/org/repo.git`. This may resolve `skuba release` errors that reference [Git password authentication is shutting down](https://github.blog/changelog/2021-08-12-git-password-authentication-is-shutting-down/) on the GitHub Blog.
