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
    return httpError(501, `unsupported tarballGet '${pkg}'`);
  };
};

const packagePut = () => {
  return async (req, res, next) => {
    return httpError(501, `unsupported packagePut '${req.params.name}'`);
  };
};

const packageGet = () => {
  return async (req, res, next) => {
    return httpError(501, `unsupported packageGet '${req.params.name}'`);
  };
};

const invalidatePost = () => {
  return async (req, res, next) => {
    return httpError(501, `unsupported invalidatePost '${req.params.name}'`);
  };
};

const distTagsGet = () => {
  return async (req, res, next) => {
    return httpError(501, `unsupported distTagsGet '${req.params.name}'`);
  };
};
const distTagsPut = () => {
  return async (req, res, next) => {
    return httpError(501, `unsupported distTagsPut '${req.params.name}/${req.params.tag}'`);
  };
};

const distTagsDelete = () => {
  return async (req, res, next) => {
    return httpError(501, `unsupported distTagsDelete '${req.params.name}/${req.params.tag}'`);
  };
};

const allPackagesGet = () => {
  return async (req, res, next) => {
    return httpError(501, `unsupported allPackagesGet`);
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
    return httpError(501, `unsupported auditPost`);
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
