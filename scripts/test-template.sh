#!/usr/bin/env sh

set -e

template="${1}"
if [ -z "$template" ]; then
  echo "Usage: pnpm run test:template <template_name>"
  exit 1
fi

directory="tmp-${template}"

skuba_tar="skuba-$(jq --raw-output '.version' < package.json).tgz"

echo '--- cleanup'
rm -rf "${directory}" "../${directory}"

echo '--- pnpm install'
pnpm install --frozen-lockfile

echo '--- pnpm run build'
pnpm run build

echo '--- npm pack'
npm pack

echo "--- skuba init ${template}"
pnpm run skuba:exec init << EOF
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

mv "${directory}" "../${directory}"

cd "../${directory}" || exit 1

echo "--- pnpm add --save-dev ../skuba/${skuba_tar}"
pnpm add --save-dev "../skuba/${skuba_tar}"

echo "--- skuba version ${template}"
pnpm exec skuba version
pnpm exec skuba -v
pnpm exec skuba --version

set +e
echo "--- pnpm run build ${template}"
output=$(pnpm run build 2>&1)
echo $output
if [[ $? -ne 0 && $output != *"Command \"build\" not found"* ]]; then
    exit 1
fi
set -e

echo "--- pnpm run lint ${template}"
pnpm run lint

echo "--- pnpm run format ${template}"
pnpm run format

echo "--- pnpm run test ${template}"
pnpm run test
