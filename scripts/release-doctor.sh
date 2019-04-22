#!/bin/sh
set -e

cd packages/bbot-doctor
rm -rf node_modules
yarn --registry http://localhost:4873
yarn checkup
