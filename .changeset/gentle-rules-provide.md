---
'skuba': patch
---

template/\*-npm-package: Use SSH scheme in repository URL

We have changed the templated format of the `package.json#repository/url` field. This may resolve `skuba release` errors that reference [Git password authentication is shutting down](https://github.blog/changelog/2021-08-12-git-password-authentication-is-shutting-down/) on the GitHub Blog.


```diff
- git+https://github.com/org/repo.git
+ git+ssh://git@github.com/org/repo.git
```
