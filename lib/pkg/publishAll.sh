#!/bin/bash
set -ex
fuse profile set poggers
fuse npm login
for pkgPath in framework ./pkg-*; do
  pkgName=$(basename $pkgPath)
  cd ${pkgName};
  yarn build;
  npm publish;
  cd ..
done
fuse profile set poggers
