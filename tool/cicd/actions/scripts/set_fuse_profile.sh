#!/usr/bin/env bash

# Make sure set -x is not set so that the profile is not echo'ed.
set +x

# Utilize latest fuse CLI to provide consistency
npm install -g @fusebit/cli

PROF_VAR=$1

if [ "${PROF_VAR}" = "" ]; then
  echo Usage: $0 [ENV_VAR_WITH_PROFILE]
  exit -1
fi

if [ "${!PROF_VAR}" == "" ]; then
  echo Profile variable ${PROF_VAR} is empty.
  exit -1
fi

echo ${!PROF_VAR} | fuse profile import ${PROF_VAR}

fuse profile set ${PROF_VAR}
fuse profile get

# Uninstall fuse cli to prevent conflicts
npm uninstall -g @fusebit/cli
