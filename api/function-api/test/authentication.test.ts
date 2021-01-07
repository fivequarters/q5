import { random } from '@5qtrs/random';
import { request } from '@5qtrs/request';
import { signJwt } from '@5qtrs/jwt';
import { createKeyPair } from '@5qtrs/key-pair';

import { addUser, cleanUpUsers, createTestJwksIssuer, cleanUpHostedIssuers } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

afterEach(async () => {
  await cleanUpHostedIssuers(account);
  await cleanUpUsers(account);
}, 180000);

describe('Authentication', () => {
  test('A request with an auth header with a valid JWT should return 200', async () => {
    const testIssuer = await createTestJwksIssuer(account);
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
    });

    const options = {
      algorithm: 'RS256',
      expiresIn: 600,
      audience: account.audience,
      issuer: testIssuer.issuerId,
      subject,
      keyid: testIssuer.keys[0].keyId,
      header: {
        jwtId: random(),
      },
    };

    const jwt = await signJwt({}, testIssuer.keys[0].privateKey, options);
    const response = await request({
      method: 'GET',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      url: `${account.baseUrl}/v1/account/${account.accountId}/user`,
    });
    expect(response).toBeHttp({ statusCode: 200 });
  }, 180000);

  test('A request with no auth header should return 403', async () => {
    const response = await request({
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      url: `${account.baseUrl}/v1/account/${account.accountId}/user`,
    });
    expect(response).toBeUnauthorizedError();
  }, 180000);

  test('A request with an auth header with no value should return 403', async () => {
    const response = await request({
      method: 'GET',
      headers: { Authorization: '', 'Content-Type': 'application/json' },
      url: `${account.baseUrl}/v1/account/${account.accountId}/user`,
    });
    expect(response).toBeUnauthorizedError();
  }, 180000);

  test('A request with an auth header with no bearer token should return 403', async () => {
    const response = await request({
      method: 'GET',
      headers: { Authorization: 'Bearer', 'Content-Type': 'application/json' },
      url: `${account.baseUrl}/v1/account/${account.accountId}/user`,
    });
    expect(response).toBeUnauthorizedError();
  }, 180000);

  test('A request with an auth header with an invalid flat token should return 403', async () => {
    const response = await request({
      method: 'GET',
      headers: { Authorization: 'Bearer 123456', 'Content-Type': 'application/json' },
      url: `${account.baseUrl}/v1/account/${account.accountId}/user`,
    });
    expect(response).toBeUnauthorizedError();
  }, 180000);

  test('A request with an auth header with a JWT with no issuer should return 403', async () => {
    const keyPair = await createKeyPair();
    const options = {
      algorithm: 'RS256',
      expiresIn: 600,
      audience: account.baseUrl,
      subject: 'sub-12345',
      keyid: 'key-abcd',
      header: {
        jwtId: random(),
      },
    };

    const jwt = await signJwt({}, keyPair.privateKey, options);
    const response = await request({
      method: 'GET',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      url: `${account.baseUrl}/v1/account/${account.accountId}/user`,
    });
    expect(response).toBeUnauthorizedError();
  }, 180000);

  test('A request with an auth header with a JWT with no subject should return 403', async () => {
    const keyPair = await createKeyPair();
    const options = {
      algorithm: 'RS256',
      expiresIn: 600,
      audience: account.baseUrl,
      issuer: 'https://some-issuer.com/',
      keyid: 'key-abcd',
      header: {
        jwtId: random(),
      },
    };

    const jwt = await signJwt({}, keyPair.privateKey, options);
    const response = await request({
      method: 'GET',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      url: `${account.baseUrl}/v1/account/${account.accountId}/user`,
    });
    expect(response).toBeUnauthorizedError();
  }, 180000);

  test('A request with an auth header with a JWT from an unknown issuer should return 403', async () => {
    const keyPair = await createKeyPair();
    const options = {
      algorithm: 'RS256',
      expiresIn: 600,
      audience: account.baseUrl,
      issuer: 'https://some-issuer.com/',
      subject: 'sub-12345',
      keyid: 'key-abcd',
      header: {
        jwtId: random(),
      },
    };

    const jwt = await signJwt({}, keyPair.privateKey, options);
    const response = await request({
      method: 'GET',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      url: `${account.baseUrl}/v1/account/${account.accountId}/user`,
    });
    expect(response).toBeUnauthorizedError();
  }, 180000);

  test('A request with an auth header with a JWT signed with the wrong key should return 403', async () => {
    const testIssuer = await createTestJwksIssuer(account);
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
    });

    const incorrectKeyPair = await createKeyPair();
    const options = {
      algorithm: 'RS256',
      expiresIn: 600,
      audience: account.baseUrl,
      issuer: testIssuer.issuerId,
      subject,
      keyid: testIssuer.keys[0].keyId,
      header: {
        jwtId: random(),
      },
    };

    const jwt = await signJwt({}, incorrectKeyPair.privateKey, options);
    const response = await request({
      method: 'GET',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      url: `${account.baseUrl}/v1/account/${account.accountId}/user`,
    });
    expect(response).toBeUnauthorizedError();
  }, 180000);

  test('A request with an auth header with a JWT with the wrong key id should return 403', async () => {
    const testIssuer = await createTestJwksIssuer(account);
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
    });

    const options = {
      algorithm: 'RS256',
      expiresIn: 600,
      audience: account.baseUrl,
      issuer: testIssuer.issuerId,
      subject,
      keyid: testIssuer.keys[1].keyId,
      header: {
        jwtId: random(),
      },
    };

    const jwt = await signJwt({}, testIssuer.keys[0].privateKey, options);
    const response = await request({
      method: 'GET',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      url: `${account.baseUrl}/v1/account/${account.accountId}/user`,
    });
    expect(response).toBeUnauthorizedError();
  }, 180000);

  test('A request with an auth header with a JWT with an unsupported algorithm should return 403', async () => {
    const testIssuer = await createTestJwksIssuer(account);
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
    });

    const options = {
      algorithm: 'HS256',
      expiresIn: 600,
      audience: account.baseUrl,
      issuer: testIssuer.issuerId,
      subject,
      keyid: testIssuer.keys[0].keyId,
      header: {
        jwtId: random(),
      },
    };

    const jwt = await signJwt({}, testIssuer.keys[0].publicKey, options);
    const response = await request({
      method: 'GET',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      url: `${account.baseUrl}/v1/account/${account.accountId}/user`,
    });
    expect(response).toBeUnauthorizedError();
  }, 180000);

  test('A request with an auth header with a JWT with an invalid audience should return 403', async () => {
    const testIssuer = await createTestJwksIssuer(account);
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
    });

    const options = {
      algorithm: 'HS256',
      expiresIn: 600,
      audience: `https://not-correct.us-east-2.fusebit.io`,
      issuer: testIssuer.issuerId,
      subject,
      keyid: testIssuer.keys[0].keyId,
      header: {
        jwtId: random(),
      },
    };

    const jwt = await signJwt({}, testIssuer.keys[0].privateKey, options);
    const response = await request({
      method: 'GET',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      url: `${account.baseUrl}/v1/account/${account.accountId}/user`,
    });
    expect(response).toBeUnauthorizedError();
  }, 180000);

  test('A request with an auth header with a JWT with an invalid issuerId should return 403', async () => {
    const testIssuer = await createTestJwksIssuer(account);
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
    });

    const options = {
      algorithm: 'HS256',
      expiresIn: 600,
      audience: account.baseUrl,
      issuer: 'http://not-the-issuer.io',
      subject,
      keyid: testIssuer.keys[0].keyId,
      header: {
        jwtId: random(),
      },
    };

    const jwt = await signJwt({}, testIssuer.keys[0].privateKey, options);
    const response = await request({
      method: 'GET',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      url: `${account.baseUrl}/v1/account/${account.accountId}/user`,
    });
    expect(response).toBeUnauthorizedError();
  }, 180000);

  test('A request with an auth header with a JWT that has expired should return 403', async () => {
    const testIssuer = await createTestJwksIssuer(account);
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
    });

    const options = {
      algorithm: 'HS256',
      expiresIn: 1,
      audience: account.baseUrl,
      issuer: testIssuer.issuerId,
      subject,
      keyid: testIssuer.keys[0].keyId,
      header: {
        jwtId: random(),
      },
    };

    await new Promise((resolve) => setTimeout(resolve, 3 * 1000));

    const jwt = await signJwt({}, testIssuer.keys[0].privateKey, options);
    const response = await request({
      method: 'GET',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      url: `${account.baseUrl}/v1/account/${account.accountId}/user`,
    });
    expect(response).toBeUnauthorizedError();
  }, 180000);
});
