const { join } = require('path');
const { getAWSCredentials } = require('../credentials');

let version = '<unknown>';
try {
  version = require(join(__dirname, '..', '..', '..', '..', '..', 'package.json')).version;
  process.env.FUNCTION_API_VERSION = version;
} catch (_) {}

function getHealth() {
  return async (req, res, next) => {
    let creds = await getAWSCredentials(false);
    if (!creds) {
      return res.status(500).json({ status: 500, statusCode: 500, message: 'credentials pending' });
    }

    res.json({ version });
  };
}

module.exports = {
  version,
  getHealth,
};
