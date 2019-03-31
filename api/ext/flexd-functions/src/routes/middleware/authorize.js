const Assert = require('assert');
const { request } = require('@5qtrs/request');
var create_error = require('http-errors');
const { writeAudit } = require('../auditing');
const { decodeJwt, decodeJwtHeader, verifyJwt } = require('@5qtrs/jwt');

var { AccountDataAws } = require('@5qtrs/account-data-aws');
var { AwsCreds } = require('@5qtrs/aws-cred');
var { AwsDeployment } = require('@5qtrs/aws-deployment');

async function getDataAccess() {
  const creds = await AwsCreds.create({
    account: process.env.AWS_ACCOUNT,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    useMfa: false,
  });
  const deployment = await AwsDeployment.create({
    regionCode: process.env.AWS_REGION,
    account: process.env.AWS_ACCOUNT,
    key: process.env.DEPLOYMENT_KEY,
  });

  const dataAccess = await AccountDataAws.create({ creds, deployment });
  return dataAccess;
}

function getTokenFromAuthorizationHeader(req) {
  if (req.headers['authorization']) {
    var match = req.headers['authorization'].match(/^\ *bearer\ +(.+)$/i);
    if (match) return match[1];
  }
  return null;
}

function doesResouceAuthorize(grantedResource, requestedResource) {
  return requestedResource.indexOf(grantedResource) === 0;
}

function doesActionAuthorize(grantedAction, requestedAction) {
  const grantedSegments = grantedAction.split(':');
  const requestedSegments = requestedAction.split(':');
  for (let i = 0; i < requestedSegments.length; i++) {
    if (grantedSegments[i]) {
      if (grantedSegments[i] === '*') {
        return true;
      } else if (grantedSegments[i] === requestedSegments[i]) {
        // ok, continue to check the next segment
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
  return false;
}

function doesAccessEntryAuthorize(accessEntry, action, resource) {
  return doesActionAuthorize(accessEntry.action, action) && doesResouceAuthorize(accessEntry.resource, resource);
}

function isAuthorized(accessEntries, action, resource) {
  for (const accessEntry of accessEntries) {
    if (doesAccessEntryAuthorize(accessEntry, action, resource)) {
      return true;
    }
  }
  return false;
}

module.exports = function authorize_factory(options) {
  Assert.ok(options, 'options must be provided');
  Assert.equal(typeof options.operation, 'string', 'options.operation must be a string');

  options.getToken = options.getToken || getTokenFromAuthorizationHeader;
  //const usersServiceUrl = process.env.USER_SERVICE || 'http://localhost:7000';

  return function authorize(req, res, next) {
    let accountId = req.params.accountId;
    if (!accountId) {
      const segments = req.params.subscriptionId.split('-');
      segments.pop;
      accountId = segments.join('-');
    }

    getDataAccess().then(dataAccess => {
      const token = options.getToken(req);
      const jwtHeader = decodeJwtHeader(token);
      const decodedJwt = decodeJwt(token);
      const iss = decodedJwt.iss;
      const sub = decodedJwt.sub;
      const action = options.operation;
      const resource = res.path;

      const context = {
        error: undefined,
        jwtValid: undefined,
        isAuthorized: undefined,
      };

      console.log('jwtHeader', jwtHeader);
      console.log('decodedJwt', decodedJwt);
      console.log('iss, sub:', iss, sub);

      function auditAndContinue() {
        if (context.error) {
          console.log('Error during Authorization: ', context.error);
          if (jwtValid === true && isAuthorized === true) {
            return writeAudit(
              {
                accountId,
                issuer: iss,
                subject: sub,
                action,
                resource,
              },
              next
            );
          }
        }
      }

      dataAccess
        .listAllAccessEntries(accountId, iss, sub)
        .then(accessEntries => {
          if (!accessEntries || !accessEntries.length) {
            return res.status(403).end();
          }
          if (isAuthorized(accessEntries, action, resource)) {
            context.isAuthorized = true;
            return auditAndContinue();
          }
          context.isAuthorized = false;
          return auditAndContinue();
        })
        .catch(error => {
          context.error = error;
          return auditAndContinue();
        });

      dataAccess
        .getPublicKeyOrJsonKeyUri(accountId, decodedJwt.iss, jwtHeader.kid)
        .then(secret => {
          if (!secret) {
            context.jwtValid = false;
            return auditAndContinue();
          }
          verifyJwt(token, secret)
            .then(result => {
              context.jwtValid = true;
              return auditAndContinue();
            })
            .catch(error => {
              context.error = error;
              return auditAndContinue();
            });
        })
        .catch(error => {
          context.error = error;
          return auditAndContinue();
        });
    });

    // TODO implement actual authorization by sending resource and action being performed

    //   if (token === process.env.API_AUTHORIZATION_KEY) {
    //     return writeAudit(
    //       {
    //         // TODO where do we obtain accountId from for requests where it is implied by subscriptionId?
    //         accountId: req.params.accountId || req.params.subscriptionId || 'NONE',
    //         issuer: 'flexd:root',
    //         subject: 'flexd:root',
    //         action: options.operation,
    //         resource: req.path,
    //       },
    //       next
    //     );
    //   }
    //   const data = { token, subscription: '12345' };
    //   const url = `${usersServiceUrl}/authorize`;
    //   request({
    //     method: 'POST',
    //     url,
    //     data,
    //     validateStatus: status => (status >= 200 && status < 300) || status === 403,
    //   })
    //     .then(response => {
    //       if (response.status !== 200) {
    //         next(create_error(403));
    //       } else {
    //         // TODO randall, move auditing his to user-api
    //         return writeAudit(
    //           {
    //             accountId: response.data.accountId || 'NONE',
    //             issuer: response.data.iss,
    //             subject: response.data.sub,
    //             action: options.operation,
    //             resource: req.path,
    //           },
    //           next
    //         );
    //       }
    //     })
    //     .catch(e => {
    //       next(create_error(500, 'Unable to authenticate the caller: ' + e.message));
    //     });
  };
};
