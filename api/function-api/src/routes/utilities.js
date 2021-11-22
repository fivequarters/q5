// Utility functions
export const NotImplemented = (_, __, next) => next(create_error(501, 'Not implemented'));

// Debug and Auditing tools

export const debugLogEvent = (req, res, next) => {
  console.log(
    `DEBUG: ${req.method} ${req.url}\n` +
      `DEBUG: Headers: ${JSON.stringify(req.headers)}\n` +
      `DEBUG: Params:  ${JSON.stringify(req.params)}\n` +
      `DEBUG: Body:    ${JSON.stringify(req.body)}\n` +
      `DEBUG: Json:    ${JSON.stringify(req.json)}\n`
  );

  let end = res.end;
  res.end = (chunk, encoding, callback) => {
    console.log(
      `DEBUG: Res Sts: ${JSON.stringify(res.statusCode)}\n` +
        `DEBUG: Res Hdr: ${JSON.stringify(res.getHeaders())}\n` +
        `DEBUG: Res Bdy: ${JSON.stringify(chunk?.toString('utf8'))}\n`
    );
    res.end = end;
    res.end(chunk, encoding, callback);
  };

  return next();
};

export const debugLogEventAsCurl = (req, res, next) => {
  console.log(
    `curl ${Object.entries(req.headers)
      .map(([name, value]) => `  -H '${name}: ${value}' \\\n`)
      .join('')}` +
      (req.body ? `  -d '${JSON.stringify(req.body)}'\\\n` : '') +
      `  -X ${req.method} http://localhost:3001${req.originalUrl}`
  );

  return next();
};

export const traceEvent = (key) => {
  return (req, res, next) => {
    console.log(`DEBUG: ${key}`);
    return next();
  };
};
