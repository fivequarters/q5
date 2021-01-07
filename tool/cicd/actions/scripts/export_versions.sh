#!/usr/bin/env bash

export VERSION_FUNCTION_API=`jq -r '.version' ./package.json`
echo "::set-output name=version-function-api::${VERSION_FUNCTION_API}"
echo "VERSION_FUNCTION_API=${VERSION_FUNCTION_API}" >> $GITHUB_ENV
export VERSION_FUSEBIT_CLI=`jq -r '.version' ./cli/fusebit-cli/package.json`
echo "::set-output name=version-fusebit-cli::${VERSION_FUSEBIT_CLI}"
echo "VERSION_FUSEBIT_CLI=${VERSION_FUSEBIT_CLI}" >> $GITHUB_ENV
export VERSION_FUSEBIT_OPS_CLI=`jq -r '.version' ./cli/fusebit-ops-cli/package.json`
echo "::set-output name=version-fusebit-ops-cli::${VERSION_FUSEBIT_OPS_CLI}"
echo "VERSION_FUSEBIT_OPS_CLI=${VERSION_FUSEBIT_OPS_CLI}" >> $GITHUB_ENV

echoerr "Versions: function_api/${VERSION_FUNCTION_API} fuse-cli/${VERSION_FUSEBIT_CLI} fuse-ops/${VERSION_FUSEBIT_OPS_CLI}"
echo { \
  \"function_api\": \"${VERSION_FUNCTION_API}\", \
  \"fuse-cli\": \"${VERSION_FUSEBIT_CLI}\",      \
  \"fuse-ops\": \"${VERSION_FUSEBIT_OPS_CLI}\"   \
}

