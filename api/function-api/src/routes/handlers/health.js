const { join } = require('path');
const { readFile } = require('fs');

const packageJsonPath = join(__dirname, '..', '..', '..', '..', '..', '..', 'package.json');
let version;

function getHealth() {
  return (req, res) => {
    if (version) {
      return res.json({ version });
    }

    readFile(packageJsonPath, (error, buffer) => {
      version = '<unknown>';
      if (!error) {
        const content = buffer.toString();
        try {
          const json = JSON.parse(content);
          version = json.version;
        } catch (__) {
          // do nothing
        }
      }

      res.json({ version });
    });
  };
}

module.exports = {
  getHealth,
};
