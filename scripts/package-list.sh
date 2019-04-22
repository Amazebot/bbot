#!/bin/sh

echo "Publich packages (for debug)"
node_modules/.bin/lerna exec --no-private -- echo \$LERNA_PACKAGE_NAME
