var Fs = require('fs');
var Path = require('path');
var exec = require('child_process').exec;
var Https = require('https');
var Url = require('url');

exports.build = function build(event, context, cb) {
    return series([
        function (cb) { save_files(event, cb); },
        function (cb) { download_dependencies(event, cb); },
        function (cb) { zip_package(event, cb); },
        function (cb) { get_package_size(event, cb); },
        function (cb) { upload_package(event, cb); },
    ], function (e) {
        return clean_up(event, function () {
            return e ? cb(e) : cb(null, { success: true });
        });
    });
};

function series(steps, cb) {
    return run_step(0);
    
    function run_step(i) {
        return (i >= steps.length) 
            ? cb()
            : steps[i](function (e) { 
                e ? cb(e) : run_step(i + 1); 
            });
    }
}

function eachLimit(col, limit, func, cb) {
    var next = 0;
    var active = 0;
    var finished;

    if (col.length === 0) return cb();
    else return startNext();

    function startNext() {
        if (next < col.length && active < limit) {
            active++;
            func(col[next++], function (e) {
                active--;
                if (!finished) {
                    if (e) { finished = true; cb(e); }
                    else if (next === col.length && active === 0) cb();
                    else startNext();
                }
            });
            startNext();
        }
    }
}

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
        res.on('data', function (c) { d+=c; });
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
    })
}

function zip_package(event, cb) {
    event.package_file = Path.join(event.dest_path, 'package.zip');
    exec(['python', Path.join(__dirname, 'zip.py'), event.package_file, event.dest_path + '/'].join(' '), {
        cwd: event.dest_path
    }, function (error, stdout, stderr) {
        if (error) return cb(error);
        console.log(stdout);
        console.error(stderr);
        return cb();
    });
}

function download_dependencies(event, cb) {
    return eachLimit(
        Object.keys(event.dependencies || {}),
        event.max_concurrent_module_download,
        function (name, cb) { download_dependency(event, name, cb); },
        cb
    );
}

function download_dependency(event, name, cb) {
    var module_dest_dir = event.dest_path + '/node_modules/' + name;
    var cmds = [
        'mkdir -p ' + module_dest_dir,
        'curl -f ' + event.module_signed_urls.get[name].url.replace(/&/g, '\\&') + ' > ' + module_dest_dir + '.zip',
        'unzip ' + module_dest_dir + '.zip -d ' + module_dest_dir,
        'rm ' + module_dest_dir + '.zip'
    ]
    exec(cmds.join(' && '), {
        cwd: event.dest_path,
        env: { HOME: '/tmp', PATH: process.env.PATH },
    }, function (error, stdout, stderr) {
        if (error) return cb(error);
        console.log(stdout);
        console.error(stderr);
        return cb();
    });
}

function save_files(event, cb) {
    event.dest_path = Path.join('/tmp', Math.floor(Math.random() * 999999999).toString(32));
    for (var file_name in event.files) {
        var file_path = Path.join(event.dest_path, file_name);
        var path_segments = file_path.split('/');
        var current_path = '/';
        try {
            for (var i = 0; i < (path_segments.length - 1); i++) {
                current_path = Path.join(current_path, path_segments[i]);
                if (!Fs.existsSync(current_path)) Fs.mkdirSync(current_path);
            }
            if (typeof event.files[file_name] === 'string') {
                Fs.writeFileSync(file_path, event.files[file_name], { encoding: 'utf8' });
            }
            else {
                Fs.writeFileSync(file_path, JSON.stringify(event.files[file_name], null, 2), { encoding: 'utf8' });
            }
        }
        catch (e) {
            return cb(e);
        }
    }
    return cb();
}
