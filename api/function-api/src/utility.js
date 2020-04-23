function jsonifyError(status, error) {
  if (error == undefined) {
    return undefined;
  }

  let result = {
    status,
    statusCode: status,
    message: error.message,
  };
  if (error.properties) {
    result.properties = error.properties;
  }
  return result;
}

module.exports = { jsonifyError };
