var Fs = require('fs');
var Path = require('path');
var exec = require('child_process').exec;
var Https = require('https');
var Url = require('url');
var zipdir = require('./zipdir');

const LAMBDA_HOME = '/tmp';

module.exports = function build(event, context, cb) {
  event.dest_path = Path.join(LAMBDA_HOME, Math.floor(Math.random() * 999999999).toString(32));
  Fs.mkdirSync(event.dest_path);

  return series(
    [
      function (cb) {
        run_npm_install(event, cb);
      },
      function (cb) {
        zip_package(event, cb);
      },
      function (cb) {
        get_package_size(event, cb);
      },
      function (cb) {
        upload_package(event, cb);
      },
    ],
    function (e) {
      clean_up(e, event, function () {
        e ? cb(e) : cb(null, { success: true });
      });
    }
  );
};

function series(steps, cb) {
  return run_step(0);

  function run_step(i) {
    return i >= steps.length
      ? cb()
      : steps[i](function (e) {
          e ? cb(e) : run_step(i + 1);
        });
  }
}

function clean_up(error, event, cb) {
  return exec('rm -rf ' + event.dest_path, function (error, stdout, stderr) {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    return cb(); // ignore errors
  });
}

function upload_package(event, cb) {
  var options = Url.parse(event.put.url);
  options.method = 'PUT';
  options.port = 443;
  var req = Https.request(options, function (res) {
    var d = '';
    res.on('data', function (c) {
      d += c;
    });
    res.on('end', function () {
      console.log('END UPLOAD RESPONSE: ', res.statusCode, d);
      return res.statusCode === 200
        ? cb()
        : cb(new Error('Error uploading module to S3: ' + res.statusCode + ': ' + d));
    });
  });
  req.setHeader('Content-Type', 'application/zip');
  req.setHeader('Content-Length', '' + event.package_size);
  req.on('error', cb);
  return Fs.createReadStream(event.package_file).pipe(req);
}

function get_package_size(event, cb) {
  return Fs.lstat(event.package_file, function (e, s) {
    if (e) return cb(e);
    event.package_size = s.size;
    return cb();
  });
}

function zip_package(event, cb) {
  event.package_file = Path.join(event.dest_path, 'package.zip');
  return zipdir(Path.join(event.dest_path, 'node_modules', event.name), event.package_file, (e) => cb(e));
}

function run_npm_install(event, cb) {
  // Write the .npmrc that specifies how to talk to Fusebit registry
  Fs.writeFileSync(Path.join(LAMBDA_HOME, '.npmrc'), event.npmrc);

  exec(
    'npm install --no-audit --verbose --production --global-style ' + event.name + '@' + event.version,
    {
      cwd: event.dest_path,
      env: { HOME: LAMBDA_HOME, PATH: process.env.PATH },
    },
    function (error, stdout, stderr) {
      if (error) return cb(error);
      console.log(stdout);
      console.error(stderr);
      return cb();
    }
  );
}
