---
parent: CLI
nav_order: 1
---

# Create a new project

---

**skuba** can guide you through an interactive prompt to initialise a new directory and Git repository for your project.
It includes a set of starter [templates] that reflect the typical components of a core SEEK service.

If you are looking to bootstrap an existing project,
see [`skuba configure`].

---

## skuba init

Creates a new local project from a starter [template].

`skuba init` does not provision any resources in AWS, Buildkite or GitHub on its own,
and only requires a connection to the public npm registry.
Most of its built-in templates start you off with a [Buildkite pipeline] that should be ready to go once you push your repository to GitHub and configure Buildkite.

### Interactive walkthrough

Let's start by running the command:

```shell
skuba init
```

and answering a few starter questions:

```shell
? For starters, some GitHub details:
⊙  Owner : SEEK-Jobs/my-team
⊙   Repo : my-repo

# ...
```

`skuba init` will initialise your CODEOWNERS file and a few others based on the specified owner.
GitHub teams can be found at the following URL:

> github.com/orgs/**SEEK-Jobs**/teams/**my-team**/repositories

You're now presented with a selection of templates:

```shell
? Select a template:
  express-rest-api
❯ greeter
  koa-rest-api
  lambda-sqs-worker
  lambda-sqs-worker-cdk
  oss-npm-package
  private-npm-package
  github →
```

Use the `↑ ↓` arrow keys, then `⏎` enter your selection.

The selected template will prompt you to fill out some additional fields.
You can skip these for now to get your bearing:

```shell
This template uses the following information:

- Prod Buildkite queue

? Fill this in now? …
  yes
❯ no

Resume this later with yarn skuba configure.
```

`skuba init` will take a while to install some initial dependencies,
after which you'll have a new directory to work with:

```shell
Initialized empty Git repository in /my-repo/.git/
Installing dependencies...

✔ All done! Try running:

cd my-repo
git push --set-upstream origin master
```

You can now proceed to the [next steps](#next-steps).

### Unattended execution

`skuba init` is interactive by default.
For unattended execution, pipe in JSON:

```shell
skuba init << EOF
{
  "destinationDir": "tmp-greeter",
  "templateComplete": true,
  "templateData": {
    "ownerName": "my-org/my-team",
    "prodBuildkiteQueueName": "123456789012:cicd",
    "repoName": "tmp-greeter"
  },
  "templateName": "greeter"
}
EOF
```

--

## Next steps

Now that you've run `skuba init`, where does that leave you?

### Git repository

Let's review the Git repository that has been initialised to see what's in there:

```shell
git log
# Clone greeter
# Initial commit

git remote get-url origin
# git@github.com:<org>/<repo>.git
```

**skuba** has committed its initial template files and configured a remote `origin` for you.
You should create the corresponding repository on GitHub and push to it:

```shell
git push --set-upstream origin master
```

### Directory structure

Familiarise yourself with the directory structure that **skuba** has created:

```shell
├── .buildkite
├── .github
└── src
    ├── app.test.ts
    ├── app.ts
├── .dockerignore
├── .eslintignore
├── .eslintrc.js
├── .gitignore
├── .nvmrc
├── .prettierignore
├── .prettierrc.js
├── Dockerfile
├── README.md
├── docker-compose.yml
├── jest.config.js
├── jest.setup.ts
├── package.json
├── skuba.template.js
├── tsconfig.build.json
├── tsconfig.json
└── yarn.lock
```

A few points to call out:

- There are configuration files aplenty for the various tools we use in **skuba** and more broadly at SEEK.
- The `.buildkite` directory houses a CI/CD pipeline that should be ready to go once you push your repository to GitHub and configure Buildkite.
- The `src` directory contains our source code, which is later compiled to `lib`.
- `package.json` lists your project dependencies and scripts.

### CLI commands

Try out some of the commands documented throughout this [CLI] section.

[`skuba lint`] may be a good starting point:

```shell
yarn lint
```

### Templating

If you skipped templating earlier,
[`skuba lint`] will complain that you haven't finished it.

Once you're ready, run [`skuba configure`]:

```shell
skuba configure
```

You can grep your directory for the values you enter to figure out where they are used,
and you can always change them later.

### README checklist

Each built-in template has a `README.md` that contains a checklist of next steps to take your project to production.

[`skuba configure`]: ./configure.md#skuba-configure
[`skuba lint`]: ./lint.md#skuba-lint
[buildkite pipeline]: https://buildkite.com/docs/pipelines/defining-steps
[cli]: ./index.md
[template]: ../templates
[templates]: ../templates
