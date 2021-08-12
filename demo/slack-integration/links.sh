PKG_PATH=/Users/ruben/Documents/fusebit/q5/lib/pkg
for pkgPath in $PKG_PATH/framework $PKG_PATH/slack-connector $PKG_PATH/pkg-*; do
  pkgName=$(basename $pkgPath)
  rm -rf node_modules/@fusebit-int/${pkgName}
  ln -sf ${pkgPath} node_modules/@fusebit-int/${pkgName}
done