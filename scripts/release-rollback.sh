#!/bin/sh
set -e

echo "Unpublish packages in local registry"
node_modules/.bin/lerna exec --no-private --stream -- npm unpublish \$LERNA_PACKAGE_NAME@* --registry http://localhost:4873 --force
