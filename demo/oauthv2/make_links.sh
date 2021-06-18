for pkgPath in ~/p/q5/lib/pkg/pkg-*; do
  pkgName=$(basename $pkgPath)

  rm -rf node_modules/@fusebit-int/${pkgName}
  ln -sf ${pkgPath} node_modules/@fusebit-int/${pkgName}
done
