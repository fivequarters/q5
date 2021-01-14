#!/usr/bin/env bash

# -- Standard Header --
set -e
echoerr() { printf "%s\n" "$*" >&2; }

# -- Optional Parameters --
AWS_PROFILE=${AWS_PROFILE:=default}
VERSION=${VERSION_FUSEBIT_EDITOR:=`jq -r '.version' ./lib/client/fusebit-editor/package.json`}

MAJOR=`echo ${VERSION} | sed 's/\([0-9]*\)\.\([0-9]*\)\.\([0-9]*\)/\1/'`
MINOR=`echo ${VERSION} | sed 's/\([0-9]*\)\.\([0-9]*\)\.\([0-9]*\)/\2/'`
PATCH=`echo ${VERSION} | sed 's/\([0-9]*\)\.\([0-9]*\)\.\([0-9]*\)/\3/'`

S3_BUCKET="s3://fusebit-io-cdn"
S3_BASE="${S3_BUCKET}/fusebit/js/fusebit-editor"
S3_LOCS="${S3_BASE}/latest/ ${S3_BASE}/${MAJOR}/ ${S3_BASE}/${MAJOR}/${MINOR}/ ${S3_BASE}/${MAJOR}/${MINOR}/${PATCH}/"

DIST=lib/client/fusebit-editor/dist

CSS_FILES="lib/client/fusebit-editor/src/fusebit-light.css lib/client/fusebit-editor/src/fusebit-dark.css"
JS_FILES="${DIST}/fusebit-editor.js ${DIST}/fusebit-editor.js.map ${DIST}/fusebit-editor.min.js ${DIST}/fusebit-editor.min.js.map"

# -- Script --
echoerr "Building package"
rm -rf lib/client/fusebit-editor/dist/
yarn build
yarn bundle fusebit-editor

AWS_OPTS="--acl public-read --cache-control max-age=300"
echoerr "Deploying CSS to S3"
for file in ${CSS_FILES}; do
  for loc in ${S3_LOCS}; do
    aws --profile=fuseprod s3 cp --content-type text/css ${AWS_OPTS} ${file} ${loc};
  done;
done

echoerr "Deploying JS to S3"
for file in ${JS_FILES}; do
  for loc in ${S3_LOCS}; do
    aws --profile=fuseprod s3 cp --content-type application/javascript ${AWS_OPTS} ${file} ${loc};
  done;
done

echoerr "Completed successfully:"
echo { \"version\": \"${VERSION}\" }
