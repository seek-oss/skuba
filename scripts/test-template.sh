#!/usr/bin/env sh

set -e

template="${1}"

directory="tmp-${template}"

echo '--- cleanup'
rm -rf "${directory}" "../${directory}"

echo '--- yarn install'
yarn install --frozen-lockfile --ignore-optional --non-interactive

echo '--- yarn build'
yarn build

echo "--- skuba init ${template}"
yarn skuba init << EOF
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
    "repoName": "${directory}",
    "serviceName": "serviceName",
    "region": "ap-southeast-2"
  },
  "templateName": "${template}"
}
EOF

mv "${directory}" "../${directory}"

cd "../${directory}" || exit 1

echo '--- yarn add skuba'
yarn add --dev 'file:../skuba'

echo "--- skuba version ${template}"
yarn skuba version
yarn skuba -v
yarn skuba --version

echo "--- skuba build ${template}"
yarn build

echo "--- skuba lint ${template}"
yarn lint

echo "--- skuba format ${template}"
yarn format

echo "--- skuba test ${template}"
yarn test
