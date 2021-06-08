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
  return next();
};

export const traceEvent = (key) => {
  return (req, res, next) => {
    console.log(`DEBUG: ${key}`);
    return next();
  };
};
