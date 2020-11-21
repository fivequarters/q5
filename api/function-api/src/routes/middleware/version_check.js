const semver = require('semver');
var http_error = require('http-errors');

// Require clients of at least this version in order to access this API endpoint.
const supportedClientVersion = {
  client: '^1.8.10',
  editor: '^1.4.4',
};

const check_agent_version = () => {
  return (req, res, next) => {
    const agent = req.userAgent;

    // If the client is a known agent, use the extracted user agent details to determine the version.
    if (agent && agent.isFusebitClient) {
      const client = agent.isFusebitCli ? 'client' : agent.isFusebitEditor ? 'editor' : undefined;
      const version = `${agent.majorVersion}.${agent.minorVersion}.${agent.patchVersion}`;
      if (agent.preReleaseVersion) {
        version += `.${agent.preReleaseVersion}`;
      }

      if (!semver.satisfies(version, supportedClientVersion[client])) {
        return next(http_error(400, `Client version is out of date (required: '${supportedClientVersion[client]}')`));
      }
    }

    return next();
  };
};

module.exports = { supportedClientVersion, check_agent_version };
