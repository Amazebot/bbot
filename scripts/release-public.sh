#!/bin/sh
set -e

echo "\n🥡 Publishing packages...\n"
node_modules/.bin/lerna exec \
  --no-private -- \
  echo \$LERNA_PACKAGE_NAME

echo "\n🏗️ Compile and test...\n"
yarn build

echo "\n💛 Health check...\n"
yarn test:checkup

echo "\n 📖 Generate docs...\n"
yarn docs

echo "\n 📙 Publishing docs...\n"

exit 1

echo "cloning github pages branch"
rm -rf gh-pages
git clone $npm_package_repository_url gh-pages

echo "checkout and apply changes"
cd gh-pages
git checkout gh-pages || git checkout --orphan gh-pages && git rm -rf .
cp -a docs/. gh-pages/.
mkdir -p gh-pages/.circleci
cp -a .circleci/. gh-pages/.circleci/.

echo "commit and push updated docs"
git add -A
git commit -m \"docs(api): Automated update to Github Pages\" --allow-empty
git push origin gh-pages
