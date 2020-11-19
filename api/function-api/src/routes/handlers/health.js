const { join } = require('path');
const create_error = require('http-errors');

const { getAWSCredentials } = require('../credentials');
const version = require(join(__dirname, '..', '..', '..', '..', '..', 'package.json')).version;

process.env.FUNCTION_API_VERSION = version;

function getHealth(...healthChecks) {
  return async (req, res, next) => {
    let creds = await getAWSCredentials(false);
    if (!creds) {
      return next(create_error(500, `aws credentials pending`));
    }

    try {
      await Promise.all(healthChecks.map((check) => check()));
    } catch (e) {
      return next(create_error(500, `healthcheck failed: ${e.message}`));
    }

    return res.json({ version });
  };
}

module.exports = {
  version,
  getHealth,
};
