function r(user, context, cb) {
  console.log('USER', user);
  console.log('CONTEXT', context);

  if (!isFusebitClientId()) {
    return cb(null, user, context);
  }

  // This is a point of customization. List of profiles that are eligible for Fusebit
  // user provisioning. An Auth0 user
  // will be provisioned in ALL profiles it is allowed to use.
  const profiles = {
    onelogin: { audience: 'https://api.us-east-1.fusebit.io', account: 'acc-9ad1aeb137774e6e' },
    'stage-us': { audience: 'https://stage.us-west-2.fusebit.io', account: 'acc-9d9341ea356841ed' },
    // 'stage-eu': { audience: 'https://stage.eu-north-1.fusebit.io', account: 'acc-28550c6a43ee4e10', },
    hyperproof: { audience: 'https://api.us-east-1.fusebit.io', account: 'acc-162db008f84a48c7' },
    'hyperproof-west': { audience: 'https://api.us-west-1.fusebit.io', account: 'acc-3ffce725b97849ac' },
    // 'criipto': { audience: 'https://stage.eu-north-1.fusebit.io', account: 'acc-977f88a34c0f452b', },
    leasera: { audience: 'https://api.us-west-1.fusebit.io', account: 'acc-0e1f89fc8f4d4d61' },
    castle: { audience: 'https://api.us-east-1.fusebit.io', account: 'acc-3e8c2e435cc64698' },
    metacx: { audience: 'https://api.us-west-1.fusebit.io', account: 'acc-9446c6fe123340f0' },
    amaranthine: { audience: 'https://api.us-west-1.fusebit.io', account: 'acc-c6174d2c86fe4c51' },
    onramp: { audience: 'https://api.us-east-1.fusebit.io', account: 'acc-0f2126328804445c' },
    influxdata: { audience: 'https://api.us-east-1.fusebit.io', account: 'acc-dd8828e9f4fe4b38' },
    reflective: { audience: 'https://api.us-east-1.fusebit.io', account: 'acc-36086c0f2dea4dc7' },
    procsea: { audience: 'https://api.us-east-1.fusebit.io', account: 'acc-2d025218c8904613' },
  };

  var ctx = { eligibleProfiles: getEligibleProfiles() };

  console.log('ELIGIBLE PROFILES', ctx.eligibleProfiles);

  if (ctx.eligibleProfiles.length === 0) {
    return cb(null, user, context);
    //return cb(new UnauthorizedError('Not authorized to access Fusebit'));
  }

  validateConfiguration();

  return async.series(
    [
      (cb) => determineFusebitProfilesToProvision(ctx, cb),
      (next) => (ctx.profilesToProvision.length === 0 ? cb(null, user, context) : next()),
      (cb) =>
        async.each(
          ctx.profilesToProvision,
          (name, cb) =>
            async.series(
              [(cb) => ensureFusebitAccessToken(name, ctx, cb), (cb) => provisionFusebitUser(name, ctx, cb)],
              cb
            ),
          cb
        ),
      (cb) => saveUserMetadata(cb),
    ],
    (e) => {
      console.log('FINISHED', e);
      return e ? cb(e) : cb(null, user, context);
    }
  );

  function saveUserMetadata(cb) {
    console.log('SAVING APP METADATA', user.app_metadata);
    auth0.users
      .updateAppMetadata(user.user_id, user.app_metadata)
      .then(() => cb())
      .catch((e) => cb(e));
  }

  function provisionFusebitUser(profileName, ctx, cb) {
    var options = {
      method: 'GET',
      url: `${profiles[profileName].audience}/v1/account/${profiles[profileName].account}/user?issuerId=https://${
        context.tenant
      }.auth0.com/&subject=${encodeURIComponent(user.user_id)}`,
      headers: { authorization: `Bearer ${global.fusebit[profiles[profileName].audience].accessToken}` },
      json: true,
    };
    console.log('PROVISIONING FUSEBIT USER');
    return request(options, (e, r, b) => {
      console.log('LIST MATCHING USER RESULT', e, r && r.statusCode, b);
      if (e) return cb(e);
      if (r.statusCode !== 200)
        return cb(new Error(`Unable to search for a Fusebit user. HTTP status code: ${r.statusCode}.`));
      if (b.items.length === 1) {
        console.log('MATCH FOUND');
        setUser(profileName, b.items[0].id);
        return cb();
      } else {
        console.log('CREATING NEW USER');
        return request(
          {
            method: 'POST',
            url: `${profiles[profileName].audience}/v1/account/${profiles[profileName].account}/user`,
            headers: {
              authorization: `Bearer ${global.fusebit[profiles[profileName].audience].accessToken}`,
              'content-type': 'application/json',
            },
            body: {
              firstName: user.given_name,
              lastName: user.family_name,
              primaryEmail: user.email,
              identities: [
                {
                  issuerId: `https://${context.tenant}.auth0.com/`,
                  subject: user.user_id,
                },
              ],
              access: { allow: getAllowAccess(profileName, ctx) },
            },
            json: true,
          },
          (e, r, b) => {
            console.log('CREATE NEW USER RESULT', e, r && r.statusCode, b);
            if (e) return cb(e);
            if (r.statusCode !== 200)
              return cb(new Error(`Unable to create Fusebit user. HTTP status code: ${r.statusCode}.`));
            setUser(profileName, b.id);
            return cb();
          }
        );
      }
    });
  }

  function setUser(profileName, userId) {
    user.app_metadata = user.app_metadata || {};
    user.app_metadata.fusebit = user.app_metadata.fusebit || {};
    user.app_metadata.fusebit[profileName] = userId;
  }

  function getAllowAccess(profileName, ctx) {
    // This is a point of customization.
    // Return the permissions a new user should be granted in the account.
    // In this case we allow access to all functions in the 'shared' boundary of
    // all specified subscriptions in a given account.

    let allow = [
      {
        action: '*',
        resource: `/account/${profiles[profileName].account}/`,
      },
    ];

    return allow;
  }

  function ensureFusebitAccessToken(profileName, ctx, cb) {
    console.log('ENSURE FUSEBIT ACCESS TOKEN', profileName);
    if (
      global.fusebit &&
      global.fusebit[profiles[profileName].audience] &&
      global.fusebit[profiles[profileName].audience].validUntil > Date.now()
    ) {
      return cb();
    }

    console.log('REQUEST FUSEBIT ACCESS TOKEN');
    return request(
      {
        method: 'POST',
        url: `https://${context.tenant}.auth0.com/oauth/token`,
        headers: { 'content-type': 'application/json' },
        body: {
          client_id: configuration.FUSEBIT_CLIENT_ID,
          client_secret: configuration.FUSEBIT_CLIENT_SECRET,
          audience: profiles[profileName].audience,
          grant_type: 'client_credentials',
        },
        json: true,
      },
      (e, r, b) => {
        console.log('REQUEST FUSEBIT ACCESS TOKEN RESPONSE', e, r && r.statusCode);
        if (e) return cb(e);
        if (r.statusCode !== 200)
          cb(new Error(`Unable to get Fusebit access token. HTTP status code: ${r.statusCode}.`));
        // console.log('AUTH0 RESPONSE', b, typeof b);
        global.fusebit = global.fusebit || {};
        global.fusebit[profiles[profileName].audience] = {
          accessToken: b.access_token,
          validUntil: ((b.expires_in || 60) - 30) * 1000 + Date.now(),
        };
        // console.log('ACCESS TOKEN', b.access_token);
        return cb();
      }
    );
  }

  function determineFusebitProfilesToProvision(ctx, cb) {
    var alreadyProvisionedProfiles = (user.app_metadata && user.app_metadata.fusebit) || {};
    ctx.profilesToProvision = [];
    ctx.eligibleProfiles.forEach((name) => {
      if (!alreadyProvisionedProfiles[name]) {
        ctx.profilesToProvision.push(name);
      }
    });
    return cb();
  }

  function getEligibleProfiles() {
    // Point of customization. Determine which users should be provisioned in which profiles:

    if (user.email_verified) {
      if (user.email.match(/\@fusebit.io$/) /*|| user.email === 'tjanczuk33@gmail.com'*/) {
        return Object.keys(profiles); // Fusebit folks can access all profiles
      } else if (
        [
          // TODO Add Hyperproof e-mail addresses here
          'bob@hyperproof.io',
          'aaron@hyperproof.io',
          'dave@hyperproof.io',
        ].indexOf(user.email) > -1
      ) {
        return ['hyperproof', 'hyperproof-west'];
      } else if (['mick.hansen@criipto.com'].indexOf(user.email) > -1) {
        return ['criipto'];
      } else if (
        [
          'barretn@leasera.com',
          'nates@leasera.com',
          'brendanh@leasera.com',
          'lalit.singh@kiwitech.com',
          'pooja.malhotra@kiwitech.com',
          'mohd.murtaza@kiwitech.com',
          'luke@leasera.com',
          'benn.bollay@gmail.com',
        ].indexOf(user.email) > -1
      ) {
        return ['leasera'];
      } else if (['johan@castle.io', 'brian@castle.io', 'sebastian@castle.io'].indexOf(user.email) > -1) {
        return ['castle'];
      } else if (['jake.miller@metacx.com'].indexOf(user.email) > -1) {
        return ['metacx'];
      } else if (['byrne.m.luke@gmail.com'].indexOf(user.email) > -1) {
        return ['amaranthine'];
      } else if (['sean@onramp.us'].indexOf(user.email) > -1) {
        return ['onramp'];
      } else if (['wkocjan@influxdata.com'].indexOf(user.email) > -1) {
        return ['influxdata'];
      } else if (['bookis@reflective.co'].indexOf(user.email) > -1) {
        return ['reflective'];
      } else if (['a.fontaine@procsea.com'].indexOf(user.email) > -1) {
        return ['procsea'];
      }
    }
    return [];
  }

  function isFusebitClientId() {
    // This is point of customization. List all client IDs that are allowed to provision
    // Fusebit users.

    return ['hSgWIXmbluQMADuWhDnRTpWyKptJe6LB', 'VFOtrBCVHEm7I9UNv7rFwu1ID1hTEueF'].indexOf(context.clientID) > -1;
  }

  function validateConfiguration() {
    ['FUSEBIT_CLIENT_ID', 'FUSEBIT_CLIENT_SECRET'].forEach((p) => {
      if (!configuration[p]) {
        throw new Error(`Required 'configuration.${p}' is not specified`);
      }
    });
  }
}
