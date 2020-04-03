const { getAccountContext, errorHandler } = require('../account');
const https = require('https');

const es = process.env.ES_HOST;
const username = process.env.ES_USER;
const password = process.env.ES_PASSWORD;

const headers = {
  'Host': es,
  'Content-Type': 'application/json',
  'Authorization': 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
};

function statisticsGet() {
  return async (req, res, next) => {
    let body = {
      version: true,
      size: 0,
      aggs: {
        statusCode: {
          terms: {
            field: 'response.statusCode'
          }
        }
      }
    };

    let accountContext = await getAccountContext();

    const params = {
      headers,
      path: '/fusebit-*/_search',
      method: 'POST',
      hostname: es,
    };

    let response = await (async () => {
      return new Promise((resolve, reject) => {
        let req = https.request(params, (response) => resolve(response));
        req.write(JSON.stringify(body));
        req.end();
      });
    })();

    response.on('data', (d) => {
      res.statusCode = response.statusCode;
      res.setHeader('Content-Type', 'application/json');
      res.write(d);
      res.end();
    });
  };
}

module.exports = {
  statisticsGet,
};
