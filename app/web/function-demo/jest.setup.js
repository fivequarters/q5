const packageJson = require('./package.json');
process.env.PORT = packageJson.devServer.port;
