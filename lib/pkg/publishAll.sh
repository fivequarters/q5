#!/bin/bash
set -e
fuse profile set dev-us-west-1
fuse npm login
for pkgPath in framework ./pkg-*; do
  pkgName=$(basename $pkgPath)
  cd ${pkgName};
  yarn build;
  npm publish;
  cd ..
done
fuse profile set dev-us-west-1.local