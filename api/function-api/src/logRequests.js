const activeRequests = {};
const captureRequest = (req, res, next) => {
  let end = res.end;
  req.activeKey = Math.floor(Math.random() * 1000);
  activeRequests[req.activeKey] = { url: req.url };
  res.end = (chunk, encoding, callback) => {
    delete activeRequests[req.activeKey];
    res.end = end;
    res.end(chunk, encoding, callback);
  };
  return next();
};

const logActiveRequests = () => {
  setTimeout(() => {
    console.log(`${JSON.stringify(Object.values(activeRequests))}`);
    logActiveRequests();
  }, 5000);
};

export { captureRequest, logActiveRequests };
