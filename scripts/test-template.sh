#!/usr/bin/env bash

set -e

update_snapshot=false

# Process optional flag
if [ "$1" == "-u" ]; then
  update_snapshot=true
  shift
fi

template="${1}"

echo "--- testing template ${update_snapshot}, ${template}"
if [ -z "$template" ]; then
  echo "Usage: pnpm test:template <template_name>"
  exit 1
fi

echo '--- pnpm install'
pnpm install --frozen-lockfile

echo '--- pnpm build'
pnpm build
pnpm --filter eslint-plugin-skuba build

echo '--- pnpm pack'
# Aaron Moat is sure there's a better way to do this
eslint_plugin_skuba_tar="$(pwd)/packages/eslint-plugin-skuba/$(cd packages/eslint-plugin-skuba && pnpm pack | grep -o 'eslint-plugin-skuba-.*\.tgz')"
jq ".dependencies[\"eslint-plugin-skuba\"] = \"file:${eslint_plugin_skuba_tar}\"" packages/eslint-config-skuba/package.json > packages/eslint-config-skuba/package.json.tmp
mv packages/eslint-config-skuba/package.json packages/eslint-config-skuba/package.json.bak
mv packages/eslint-config-skuba/package.json.tmp packages/eslint-config-skuba/package.json
eslint_config_skuba_tar="$(pwd)/packages/eslint-config-skuba/$(cd packages/eslint-config-skuba && pnpm pack | grep -o 'eslint-config-skuba-.*\.tgz')"
mv packages/eslint-config-skuba/package.json.bak packages/eslint-config-skuba/package.json

jq ".dependencies[\"eslint-config-skuba\"] = \"file:${eslint_config_skuba_tar}\"" package.json > package.json.tmp
mv package.json package.json.bak
mv package.json.tmp package.json
skuba_tar="$(pwd)/$(pnpm pack | grep -o 'skuba-.*\.tgz')"
mv package.json.bak package.json

skuba_temp_directory='tmp-skuba'

echo '--- cleanup'
rm -rf "../${skuba_temp_directory}"

echo "--- setting up ${skuba_temp_directory}"
mkdir "../${skuba_temp_directory}"

cd "../${skuba_temp_directory}" || exit 1

echo "pnpm init"
pnpm init
echo "--- pnpm add --save-dev ${skuba_tar}"
pnpm add --save-dev ${skuba_tar}

directory="./tmp-${template}"

echo "--- skuba init ${template}"
pnpm exec skuba init << EOF
{
  "destinationDir": "${directory}",
  "templateComplete": true,
  "templateData": {
    "description": "description",
    "devBuildkiteQueueName": "my-account-dev:cicd",
    "devGantryEnvironmentName": "dev",
    "moduleName": "first-module",
    "ownerName": "my-org/my-team",
    "prodAwsAccountId": "000000000000",
    "prodBuildkiteQueueName": "my-account-prod:cicd",
    "prodGantryEnvironmentName": "prod",
    "platformName": "arm64",
    "repoName": "${directory}",
    "serviceName": "serviceName",
    "region": "ap-southeast-2",
    "defaultBranch": "main"
  },
  "templateName": "${template}"
}
EOF

cd "${directory}" || exit 1

echo "--- pnpm add --save-dev ${skuba_tar}"
pnpm add --save-dev ${skuba_tar}

echo "--- skuba version ${template}"
pnpm exec skuba version
pnpm exec skuba -v
pnpm exec skuba --version

set +e
echo "--- pnpm build ${template}"
output=$(pnpm build 2>&1)
result=$?
echo "$output"
if [[ $result -ne 0 && $output != *"Command \"build\" not found"* ]]; then
    exit 1
fi
set -e

echo "--- pnpm lint ${template}"
pnpm lint

echo "--- pnpm format ${template}"
pnpm format

if [ "$update_snapshot" = true ]; then
  echo "--- pnpm test --updateSnapshot ${template}"
  pnpm test -- --updateSnapshot
  cd ../../skuba || exit 1
  bash ./scripts/update-template-snapshot.sh ${skuba_temp_directory} ${template}
else
  echo "--- pnpm test ${template}"
  pnpm test
fi
