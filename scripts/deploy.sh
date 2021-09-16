#!/usr/bin/env bash

set -e

echo '=> Packaging...'

rm -rf dist-docs

mkdir -p dist-docs

changelog="$(cat CHANGELOG.md)"

old_header='# skuba'

new_header="$(cat << EOF
---
nav_order: 98
---

# Changelog

---
EOF
)"

echo "${changelog/#"${old_header}"/"${new_header}"}" > dist-docs/CHANGELOG.md

cp CONTRIBUTING.md index.md site/_config.yml dist-docs/
cp -R docs/ dist-docs/docs/

cd dist-docs

git init

git add --all

git \
-c 'user.email=<>' \
-c 'user.name=skuba' \
commit \
--author 'skuba <>' \
--message 'Deploy to GitHub Pages' \
--quiet

echo '=> Deploying...'

{
  GIT_URL="git@github.com:seek-oss/skuba.git"

  if [ "${IS_GITHUB_PAGES:-}" = 'true' ]; then
    GIT_URL="https://${GITHUB_ACTOR}:${GITHUB_TOKEN}@github.com/seek-oss/skuba.git"
  fi

  git push --force --quiet "${GIT_URL}" 'master:gh-pages'
}

cd ..
rm -rf dist-docs

echo "=> Deployed: https://seek-oss.github.io/skuba"
