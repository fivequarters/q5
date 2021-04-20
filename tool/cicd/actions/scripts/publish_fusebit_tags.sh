#!/bin/bash
VERSION=`jq -rc ".version" cli/fusebit-ops-cli/package.json`
git tag ops-cli-${VERSION} || true
VERSION=`jq -rc ".version" cli/fusebit-cli/package.json`
git tag cli-${VERSION} || true
VERSION=`jq -rc ".version" package.json`
git tag api-${VERSION} || true
VERSION=`jq -rc ".version" lib/client/fusebit-editor/package.json`
git tag editor-${VERSION} || true
VERSION=`jq -rc ".version" site/portal/package.json`
git tag portal-${VERSION} || true
git push --tags || true