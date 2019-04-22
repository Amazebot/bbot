#!/bin/sh
set -e

echo "\n┌(O_O)┘ Publich packages to local registry..."
node_modules/.bin/lerna publish from-git --registry http://localhost:4873 --force-publish=* --no-push
