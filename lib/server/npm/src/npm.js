const { version } = require('./health');
const httpError = require('http-errors');

export const versionGet = () => {
  return async (req, res, next) => {
    return res.status(200).json({ version });
  };
};

const pingGet = () => {
  return async (req, res, next) => {
    return res.status(200).json({});
  };
};

const tarballGet = () => {
  return async (req, res, next) => {
    const pkg = `${req.params.scope ? req.params.scope + '/' : ''}${req.params.name}`;
    return next(httpError(501, `unsupported tarballGet '${pkg}'`));
  };
};

const packagePut = () => {
  return async (req, res, next) => {
    return next(httpError(501, `unsupported packagePut '${req.params.name}'`));
  };
};

const packageGet = () => {
  return async (req, res, next) => {
    res.status(200).json({
      _id: 'libnpm',
      _rev: '30-9efa3a315b695fe54f063f48c1566efc',
      name: 'libnpm',
      description: 'Collection of programmatic APIs for the npm CLI',
      'dist-tags': {
        latest: '3.0.1',
      },
      versions: {
        '3.0.1': {
          name: 'libnpm',
          version: '3.0.1',
          description: 'Collection of programmatic APIs for the npm CLI',
          main: 'index.js',
          scripts: {
            prerelease: 'npm t',
          },
          repository: {},
          keywords: ['npm'],
          author: {
            name: 'Kat March\u00e1n',
          },
          license: 'ISC',
          dependencies: {
            'bin-links': '^1.1.2',
          },
          devDependencies: {
            nock: '^9.2.3',
          },
          gitHead: 'd24cd693afa7df9be25967d526cdd695781d1523',
          bugs: {
            url: 'https://github.com/npm/libnpm/issues',
          },
          homepage: 'https://github.com/npm/libnpm#readme',
          _id: 'libnpm@3.0.1',
          _nodeVersion: '12.4.0',
          _npmVersion: '6.10.1',
          dist: {
            integrity:
              'sha512-d7jU5ZcMiTfBqTUJVZ3xid44fE5ERBm9vBnmhp2ECD2Ls+FNXWxHSkO7gtvrnbLO78gwPdNPz1HpsF3W4rjkBQ==',
            shasum: '0be11b4c9dd4d1ffd7d95c786e92e55d65be77a2',
            tarball: 'https://registry.npmjs.org/libnpm/-/libnpm-3.0.1.tgz',
            fileCount: 30,
            unpackedSize: 9644,
          },
          maintainers: [
            {
              email: 'i@izs.me',
              name: 'isaacs',
            },
          ],
          directories: {},
          _hasShrinkwrap: false,
        },
      },
      readme: '# libnpm',
      time: {
        modified: '2020-09-17T17:48:19.935Z',
        created: '2017-12-21T23:46:49.119Z',
        '3.0.1': '2019-07-16T17:50:00.572Z',
      },
      keywords: ['npm'],
    });
    return;
  };
};

const invalidatePost = () => {
  return async (req, res, next) => {
    return next(httpError(501, `unsupported invalidatePost '${req.params.name}'`));
  };
};

const distTagsGet = () => {
  return async (req, res, next) => {
    return next(httpError(501, `unsupported distTagsGet '${req.params.name}'`));
  };
};
const distTagsPut = () => {
  return async (req, res, next) => {
    return next(httpError(501, `unsupported distTagsPut '${req.params.name}/${req.params.tag}'`));
  };
};

const distTagsDelete = () => {
  return async (req, res, next) => {
    return next(httpError(501, `unsupported distTagsDelete '${req.params.name}/${req.params.tag}'`));
  };
};

const allPackagesGet = () => {
  return async (req, res, next) => {
    return next(httpError(501, `unsupported allPackagesGet`));
  };
};

const loginPut = () => {
  return async (req, res, next) => {
    // In theory it's already been authorized by the time it gets here.
    return res.status(201).json({ token: req.body });
  };
};

const whoamiGet = () => {
  return async (req, res, next) => {
    return res.status(200).json({ username: req.resolvedAgent });
  };
};

const auditPost = () => {
  return async (req, res, next) => {
    return next(httpError(501, `unsupported auditPost`));
  };
};

module.exports = {
  versionGet,
  pingGet,
  tarballGet,
  packagePut,
  packageGet,
  invalidatePost,
  distTagsGet,
  distTagsPut,
  distTagsDelete,
  allPackagesGet,
  loginPut,
  whoamiGet,
  auditPost,
};
