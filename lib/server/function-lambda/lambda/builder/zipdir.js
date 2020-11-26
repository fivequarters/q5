const child_process = require('child_process');

module.exports = function zipWrite(rootDir, destFile, cb) {
  try {
    child_process.execSync(`/var/task/zip -qr ${destFile} *`, {
      cwd: rootDir,
    });
  } catch (e) {
    return cb(e);
  }
  return cb();
};
