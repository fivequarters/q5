const Assert = require('assert');
const { writeAudit } = require('../auditing');
const { decodeJwt, decodeJwtHeader, verifyJwt } = require('@5qtrs/jwt');
const { meterApiCall } = require('@5qtrs/bq-metering');

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
  if (grantedAction === requestedAction) {
    return true;
  }
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
  const actionAuth = doesActionAuthorize(accessEntry.action, action);
  const resourceAuth = doesResouceAuthorize(accessEntry.resource, resource);
  return actionAuth && resourceAuth;
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
    let resource = req.path;
    const action = options.operation;

    getDataAccess().then(dataAccess => {
      const token = options.getToken(req);
      if (token === process.env.API_AUTHORIZATION_KEY) {
        req.isRoot = true;
        meterApiCall({
          deploymentId: process.env.DEPLOYMENT_KEY,
          accountId: accountId || 'acc-0000000000000000',
          issuer: 'flexd:root',
          subject: 'flexd:root',
          action,
          resource,
          subscriptionId: req.params.subscriptionId,
          boundaryId: req.params.boundaryId,
          functionId: req.params.functionId,
          issuerId: req.params.issuerId,
          agentId: req.params.userId || req.params.clientId,
          userAgent: req.headers['x-user-agent'] || req.headers['user-agent'],
        });
        return writeAudit(
          {
            accountId: accountId || 'acc-0000000000000000',
            issuer: 'flexd:root',
            subject: 'flexd:root',
            action,
            resource,
          },
          next
        );
      }

      const jwtHeader = decodeJwtHeader(token);
      const decodedJwt = decodeJwt(token);
      const iss = decodedJwt.iss;
      const sub = decodedJwt.sub;

      const context = {
        error: undefined,
        jwtValid: undefined,
        isAuthorized: undefined,
      };

      function auditAndContinue() {
        if (context.jwtValid === true && context.isAuthorized === true) {
          meterApiCall({
            deploymentId: process.env.DEPLOYMENT_KEY,
            accountId,
            issuer: iss,
            subject: sub,
            action,
            resource,
            subscriptionId: req.params.subscriptionId,
            boundaryId: req.params.boundaryId,
            functionId: req.params.functionId,
            issuerId: req.params.issuerId,
            agentId: req.params.userId || req.params.clientId,
            userAgent: req.headers['x-user-agent'] || req.headers['user-agent'],
          });
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
        if (context.error || context.jwtValid === false || context.isAuthorized === false) {
          res.status(403).end();
        }
      }

      dataAccess
        .listAllAccessEntries(accountId, iss, sub)
        .then(accessEntries => {
          if (!accessEntries || !accessEntries.length) {
            context.isAuthorized = false;
            return auditAndContinue();
          }
          // Pass this along to the user resource that needs this
          // to ensure that users are not elevating their own access
          req.accessEntries = accessEntries;
          if (isAuthorized(accessEntries, action, resource)) {
            context.isAuthorized = true;
            return auditAndContinue();
          }
          context.isAuthorized = false;
          return auditAndContinue();
        })
        .catch(error => {
          context.error = error;
          context.isAuthorized = false;
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
              context.isAuthorized = false;
              return auditAndContinue();
            });
        })
        .catch(error => {
          context.error = error;
          context.isAuthorized = false;
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
