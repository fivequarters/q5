const write_logs = require('./write_logs');

exports.post_logs = (req, res) => {
  return write_logs(req.logs, req.body, e => {
    res.sendStatus(e ? 500 : 200);
  });
};
