#!/usr/bin/env sh

set -e

template="${1}"
if [ -z "$template" ]; then
  echo "Usage: pnpm test:template <template_name>"
  exit 1
fi

directory="tmp-${template}"

echo '--- cleanup'
rm -rf "${directory}" "../${directory}"

echo '--- pnpm install'
pnpm install --frozen-lockfile

echo '--- pnpm build'
pnpm build

echo '--- pnpm pack'
skuba_tar=$(pnpm pack)

echo "--- skuba init ${template}"
pnpm skuba:exec init << EOF
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

skuba_dir=$(pwd)

cd "../${directory}" || exit 1

echo "--- pnpm add --save-dev ${skuba_dir}/${skuba_tar}"
pnpm add --save-dev "${skuba_dir}/${skuba_tar}"

echo "--- skuba version ${template}"
pnpm exec skuba version
pnpm exec skuba -v
pnpm exec skuba --version

set +e
echo "--- pnpm build ${template}"
output=$(pnpm build 2>&1)
echo $output
if [[ $? -ne 0 && $output != *"Command \"build\" not found"* ]]; then
    exit 1
fi
set -e

echo "--- pnpm lint ${template}"
pnpm lint

echo "--- pnpm format ${template}"
pnpm format

echo "--- pnpm test ${template}"
pnpm test
