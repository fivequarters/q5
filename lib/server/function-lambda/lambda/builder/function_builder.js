var Fs = require('fs');
var Path = require('path');
var exec = require('child_process').exec;
var Https = require('https');
var Url = require('url');
var Async = require('async');
var Zip = require('jszip');
var zipdir = require('./zipdir');
var mkdir = require('./mkdir');

module.exports = function build(event, context, cb) {
  return Async.series(
    [
      (cb) => save_files(event, cb),
      (cb) => download_dependencies(event, cb),
      (cb) => zip_package(event, cb),
      (cb) => get_package_size(event, cb),
      (cb) => upload_package(event, cb),
    ],
    (e) => {
      return clean_up(event, function () {
        return e ? cb(e) : cb(null, { success: true });
      });
    }
  );
};

function clean_up(event, cb) {
  return exec('rm -rf ' + event.dest_path, function (error, stdout, stderr) {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    return cb(error);
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
      console.log('END FUNCTION DEPLOYMENT PACKAGE UPLOAD: ', res.statusCode, d);
      return res.statusCode === 200
        ? cb()
        : cb(new Error('Error uploading deployment package to S3: ' + res.statusCode + ': ' + d));
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
  return zipdir(event.dest_path, event.package_file, (e) => cb(e));
}

function download_dependencies(event, cb) {
  return Async.eachLimit(
    Object.keys(event.dependencies || {}),
    event.max_concurrent_module_download,
    (name, cb) => download_dependency(event, name, cb),
    cb
  );
}

function download_dependency(event, name, cb) {
  let module_dest_dir = `${event.dest_path}/node_modules/${name}`;
  let fileName = `${module_dest_dir}.zip`;

  return Async.series(
    [
      (cb) => mkdir(module_dest_dir, (e) => cb(e)),
      (cb) => download(cb),
      (cb) => unzip(cb),
      (cb) => Fs.unlink(fileName, (e) => cb(e)),
    ],
    cb
  );

  function download(cb) {
    let file = Fs.createWriteStream(fileName);
    const request = Https.get(event.module_signed_urls.get[name].url, (res) => {
      if (res.statusCode !== 200) {
        return cb(new Error(`Error downloading package for ${name}: ${res.statusCode}`));
      }

      res.pipe(file);
      file.on('finish', () => file.close(cb));
    });
    request.on('error', (e) => {
      Fs.unlink(fileName, () => {});
      cb(e);
    });
  }

  function unzip(cb) {
    Fs.readFile(fileName, (e, d) => {
      if (e) return cb(e);
      var zip = new Zip();
      zip
        .loadAsync(d)
        .catch((e) => cb(e))
        .then((contents) => {
          let directories = [];
          let files = [];
          contents.forEach((path, file) => (file.dir ? directories.push(file) : files.push(file)));
          // console.log('MANIFEST', directories.length, files.length);

          return Async.series([(cb) => create_directories(cb), (cb) => unzip_files(cb)], cb);

          function create_directories(cb) {
            return Async.eachLimit(directories, 100, (d, cb) => mkdir(Path.join(module_dest_dir, d.name), cb), cb);
          }

          function unzip_files(cb) {
            Async.eachLimit(
              files,
              100,
              (f, cb) => {
                try {
                  f.async('nodebuffer')
                    .then((content) => {
                      Fs.writeFile(Path.join(module_dest_dir, f.name), content, cb);
                    })
                    .catch((e) => {
                      console.log('ERROR IN UNZIP', e);
                      cb(e);
                    });
                } catch (e) {
                  console.log('SYNC ERROR IN UNZIP', e);
                  cb(e);
                }
              },
              cb
            );
          }
        });
    });
  }
}

function save_files(event, cb) {
  event.dest_path = Path.join('/tmp', Math.floor(Math.random() * 999999999).toString(32));
  event.app_path = Path.join(event.dest_path, 'app');

  // Save all application files to the `app` subdirectory
  for (var file_name in event.files) {
    var file_path = Path.join(event.app_path, file_name);
    var path_segments = file_path.split('/');
    var current_path = '/';
    try {
      for (var i = 0; i < path_segments.length - 1; i++) {
        current_path = Path.join(current_path, path_segments[i]);
        if (!Fs.existsSync(current_path)) Fs.mkdirSync(current_path);
      }
      if (typeof event.files[file_name] === 'string') {
        Fs.writeFileSync(file_path, event.files[file_name], { encoding: 'utf8' });
      } else {
        Fs.writeFileSync(file_path, JSON.stringify(event.files[file_name], null, 2), { encoding: 'utf8' });
      }
    } catch (e) {
      return cb(e);
    }
  }

  for (var file_name in event.encodedFiles) {
    var file_path = Path.join(event.app_path, file_name);
    var path_segments = file_path.split('/');
    var current_path = '/';
    try {
      for (var i = 0; i < path_segments.length - 1; i++) {
        current_path = Path.join(current_path, path_segments[i]);
        if (!Fs.existsSync(current_path)) Fs.mkdirSync(current_path);
      }
      const encodedFile = event.encodedFiles[file_name];
      Fs.writeFileSync(file_path, Buffer.from(encodedFile.data, encodedFile.encoding));
    } catch (e) {
      return cb(e);
    }
  }

  // Save internal files (e.g. executor.js) to the top level directory
  for (var file_name in event.internal_files) {
    var file_path = Path.join(event.dest_path, file_name);
    try {
      if (typeof event.internal_files[file_name] === 'string') {
        Fs.writeFileSync(file_path, event.internal_files[file_name], { encoding: 'utf8' });
      } else {
        Fs.writeFileSync(file_path, JSON.stringify(event.internal_files[file_name], null, 2), { encoding: 'utf8' });
      }
    } catch (e) {
      return cb(e);
    }
  }
  return cb();
}
