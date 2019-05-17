const Fs = require('fs');
const exec = require('child_process').exec;

let is8 = process.versions.node.match(/^8\./);

module.exports = function mkdir(path, cb) {
  if (is8) {
    return exec(`mkdir -p ${path}`, e => cb(e));
  } else {
    return Fs.mkdir(path, { recursive: true }, e => cb(e));
  }
};
