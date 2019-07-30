const agentRegex = /fusebit-(editor|cli)\/(\d+)\.(\d+)\.(\d+)(-([\w\d\.]+))?/;

module.exports = function agent_factory() {
  return function agent(req, res, next) {
    const agent = {
      isFusebitClient: false,
      isFusebitEditor: false,
      isFusebitCli: false,
      majorVersion: -1,
      minorVersion: -1,
      patchVersion: -1,
      preReleaseVersion: undefined,
      isAtLeastVersion: (major, minor, patch) => {
        return agent.majorVersion > major || agent.minorVersion > minor || agent.patchVersion >= patch;
      },
    };

    const agentHeader = req.headers['x-user-agent'] || req.headers['user-agent'];
    if (agentHeader) {
      const match = agentHeader.match(agentRegex);
      if (match) {
        agent.isFusebitClient = true;
        agent.isFusebitCli = match[1] === 'cli';
        agent.isFusebitEditor = match[1] === 'editor';
        agent.majorVersion = +match[2];
        agent.minorVersion = +match[3];
        agent.patchVersion = +match[4];
        agent.preReleaseVersion = match[6];
      }
    }
    req.userAgent = agent;
    return next();
  };
};
