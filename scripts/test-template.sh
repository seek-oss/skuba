#!/usr/bin/env bash

set -e

update_snapshot=false

# Process optional flag
if [ "$1" == "-u" ]; then
  update_snapshot=true
  shift
fi

template="${1}"

echo "--- testing template: ${template}" with update snapshot: ${update_snapshot}, 
if [ -z "$template" ]; then
  echo "Usage: pnpm test:template <template_name>"
  exit 1
fi

echo '--- pnpm install'
pnpm install --frozen-lockfile

echo '--- pnpm build'
pnpm build

skuba_temp_directory='tmp-skuba'

echo '--- cleanup'
rm -rf "../${skuba_temp_directory}" || true

echo '--- pnpm deploy'
pnpm deploy --filter . "../${skuba_temp_directory}"

cd "../${skuba_temp_directory}" || exit 1
skuba_temp_install_directory="$(pwd)"
directory="./tmp-${template}"

echo "--- skuba init ${template}"
SKUBA_INTEGRATION_TEST=true node ./lib/skuba.js init << EOF
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
    "defaultBranch": "main",
    "devDataDogApiKeySecretArn": "arn:aws:secretsmanager:<Region>:<AccountId>:secret:datadog-api-key",
    "prodDataDogApiKeySecretArn": "arn:aws:secretsmanager:<Region>:<AccountId>:secret:datadog-api-key"
  },
  "templateName": "${template}"
}
EOF

cd "${directory}" || exit 1

echo "--- pnpm add --save-dev ${skuba_temp_install_directory}"
pnpm add --save-dev ${skuba_temp_install_directory}

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
  pnpm test --updateSnapshot
  cd ../../skuba || exit 1
  bash ./scripts/update-template-snapshot.sh ${skuba_temp_directory} ${template}
else
  echo "--- pnpm test ${template}"
  pnpm test
fi
