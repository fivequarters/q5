const http_error = require('http-errors');

// Require clients of at least this version in order to access this API endpoint.
const supportedClientVersion = {
  client: {
    v: '^1.8.11',
    m: (agent) =>
      `Your @fusebit/cli version ${agent.version} is out of date (required: ${supportedClientVersion.client.v}). Please run 'npm install -g @fusebit/cli' to update.`,
  },
  editor: {
    v: '^1.4.5',
    m: (agent) =>
      `Your editor version ${agent.version} is out of date (required: ${supportedClientVersion.editor.v}). Please notify your administrator.`,
  },
};

const check_agent_version = () => {
  return (req, res, next) => {
    const agent = req.userAgent;

    // If the client is a known agent, use the extracted user agent details to determine the version.
    if (agent && agent.isFusebitClient) {
      const client = agent.isFusebitCli ? 'client' : agent.isFusebitEditor ? 'editor' : undefined;
      if (!agent.validate(supportedClientVersion[client].v)) {
        return next(http_error(400, supportedClientVersion[client].m(agent)));
      }
    }
    return next();
  };
};

module.exports = { supportedClientVersion, check_agent_version };
