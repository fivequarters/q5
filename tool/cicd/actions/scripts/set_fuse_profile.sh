#!/usr/bin/env bash

# Make sure set -x is not set so that the profile is not echo'ed.
set +x

PROF_VAR=$1
FUSE_CMD=${FUSE_CMD:="node cli/fusebit-cli/libc/index.js"}

if [ "${PROF_VAR}" = "" ]; then
  echo Usage: $0 [ENV_VAR_WITH_PROFILE]
  exit -1
fi

if [ "${!PROF_VAR}" == "" ]; then
  echo Profile variable ${PROF_VAR} is empty.
  exit -1
fi

echo ${!PROF_VAR} | ${FUSE_CMD} profile import ${PROF_VAR}

${FUSE_CMD} profile set ${PROF_VAR}
${FUSE_CMD} profile get
