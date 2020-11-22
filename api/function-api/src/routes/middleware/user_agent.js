const semver = require('semver');

const agentRegex = /fusebit-(editor|cli)\/([\S]*)/;

module.exports = function agent_factory() {
  return function agent(req, res, next) {
    const agent = {
      isFusebitClient: false,
      isFusebitEditor: false,
      isFusebitCli: false,
      version: '0.0.0',
      validate: (version) => semver.satisfies(agent.version, version),
    };

    const agentHeader = req.headers['x-user-agent'] || req.headers['user-agent'];
    if (agentHeader) {
      const match = agentHeader.match(agentRegex);
      if (match) {
        agent.isFusebitClient = true;
        agent.isFusebitCli = match[1] === 'cli';
        agent.isFusebitEditor = match[1] === 'editor';
        agent.version = match[2];
      }
    }
    req.userAgent = agent;
    return next();
  };
};
