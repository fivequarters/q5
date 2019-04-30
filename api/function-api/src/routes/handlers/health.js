const { join } = require('path');

let version = '<unknown>';
try {
  version = require(join(__dirname, '..', '..', '..', '..', '..', 'package.json')).version;
} catch (_) {}

function getHealth() {
  return (req, res) => res.json({ version });
}

module.exports = {
  getHealth,
};
