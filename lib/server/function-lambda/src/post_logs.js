const write_logs = require('./write_logs');

module.exports = function lambda_post_logs(req, res) {
  return write_logs(req.logs, req.body, e => {
    res.send(e ? 500 : 200);
  });
};
