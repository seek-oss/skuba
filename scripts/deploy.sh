#!/usr/bin/env sh

set -e

echo '=> Packaging...'

rm -rf dist-docs

mkdir -p dist-docs

cp CONTRIBUTING.md dist-docs/CONTRIBUTING.md
cp README.md dist-docs/index.md
cp -R site/ dist-docs/
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
