import {
  IAccount,
  FakeAccount,
  cloneWithAccessToken,
  resolveAccount,
  getMalformedAccount,
  getNonExistingAccount,
} from './accountResolver';
import {
  createTestUser,
  createTestJwksIssuer,
  addUser,
  addClient,
  listAudit,
  cleanUpUsers,
  cleanUpClients,
  cleanUpIssuers,
  cleanUpHostedIssuers,
} from './sdk';
import { random } from '@5qtrs/random';
import { extendExpect } from './extendJest';

const expectMore = extendExpect(expect);

let account: IAccount = FakeAccount;

beforeAll(async () => {
  account = await resolveAccount();
});

afterEach(async () => {
  await cleanUpUsers(account);
  await cleanUpClients(account);
  await cleanUpIssuers(account);
  await cleanUpHostedIssuers(account);
}, 180000);

describe('Audit', () => {
  describe('List', () => {
    test('Listing audit entries without any options should be supported', async () => {
      const testUser = await createTestUser(account, {
        access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
      });
      const testAccount = cloneWithAccessToken(account, testUser.accessToken);
      await Promise.all([addUser(testAccount, {}), addClient(testAccount, {})]);

      const audit = await listAudit(account);
      expect(audit.status).toBe(200);
      expect(audit.data).toBeDefined();
      expect(audit.data.items).toBeDefined();
      expect(audit.data.items.length).toBeGreaterThan(2);
    }, 180000);

    test('Listing audit entries should return in order by timestamp', async () => {
      const testUser = await createTestUser(account, {
        access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
      });
      const testAccount = cloneWithAccessToken(account, testUser.accessToken);
      await Promise.all([addUser(testAccount, {}), addClient(testAccount, {})]);

      const audit = await listAudit(account);
      expect(audit.status).toBe(200);
      expect(audit.data).toBeDefined();
      expect(audit.data.items).toBeDefined();
      expect(audit.data.items.length).toBeGreaterThan(2);
      let lastTime = new Date(audit.data.items[0].timestamp).getTime();
      for (const item of audit.data.items) {
        const timestamp = new Date(item.timestamp).getTime();
        expect(timestamp).toBeGreaterThanOrEqual(lastTime);
        lastTime = timestamp;
      }
    }, 180000);

    test('Listing audit entries filtered by issuer should be supported', async () => {
      const testUser = await createTestUser(account, {
        access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
      });
      const testAccount = cloneWithAccessToken(account, testUser.accessToken);
      await Promise.all([addUser(testAccount, {}), addClient(testAccount, {})]);
      const now = Date.now();

      const audit = await listAudit(account, { issuerId: testUser.identities[0].issuerId });
      expect(audit.status).toBe(200);
      expect(audit.data).toBeDefined();
      expect(audit.data.items).toBeDefined();
      expect(audit.data.items.length).toBe(2);
      for (const item of audit.data.items) {
        expect(item.issuerId).toBe(testUser.identities[0].issuerId);
        expect(item.subject).toBe(testUser.identities[0].subject);
        expect(item.accountId).toBe(testAccount.accountId);

        const timestamp = new Date(item.timestamp).getTime();
        expect(timestamp).toBeGreaterThan(now - 10000);
        expect(timestamp).toBeLessThan(now + 10000);

        if (item.action === 'user:add') {
          expect(item.authorized).toBe(true);
          expect(item.resource).toBe(`/account/${testAccount.accountId}/user/`);
        } else {
          expect(item.action).toBe('client:add');
          expect(item.authorized).toBe(false);
          expect(item.resource).toBe(`/account/${testAccount.accountId}/client/`);
        }
      }
    }, 180000);

    test('Listing audit entries filtered by issuer and subject should be supported', async () => {
      const testIssuer = await createTestJwksIssuer(account);
      const subject1 = `sub-${random({ lengthInBytes: 8 })}`;
      await addUser(account, {
        identities: [{ issuerId: testIssuer.issuerId, subject: subject1 }],
        access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
      });
      const testAccount1 = cloneWithAccessToken(account, await testIssuer.getAccessToken(subject1));
      const subject2 = `sub-${random({ lengthInBytes: 8 })}`;
      await addUser(account, {
        identities: [{ issuerId: testIssuer.issuerId, subject: subject2 }],
        access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
      });
      const testAccount2 = cloneWithAccessToken(account, await testIssuer.getAccessToken(subject2));
      await Promise.all([addUser(testAccount1, {}), addUser(testAccount2, {})]);
      const now = Date.now();

      const audit = await listAudit(account, { issuerId: testIssuer.issuerId, subject: subject1 });
      expect(audit.status).toBe(200);
      expect(audit.data).toBeDefined();
      expect(audit.data.items).toBeDefined();
      expect(audit.data.items.length).toBe(1);
      for (const item of audit.data.items) {
        expect(item.issuerId).toBe(testIssuer.issuerId);
        expect(item.subject).toBe(subject1);
        expect(item.accountId).toBe(testAccount1.accountId);
        const timestamp = new Date(item.timestamp).getTime();
        expect(timestamp).toBeGreaterThan(now - 10000);
        expect(timestamp).toBeLessThan(now + 10000);
        expect(item.authorized).toBe(true);
        expect(item.resource).toBe(`/account/${testAccount1.accountId}/user/`);
      }
    }, 180000);

    test('Listing audit entries filtered by subject without issuer is not supported', async () => {
      const testUser = await createTestUser(account, {
        access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
      });
      const testAccount = cloneWithAccessToken(account, testUser.accessToken);
      await Promise.all([addUser(testAccount, {}), addClient(testAccount, {})]);
      const now = Date.now();

      const subject = testUser.identities[0].subject;
      const audit = await listAudit(account, { subject });
      expectMore(audit).toBeHttpError(
        400,
        `The 'subject' filter '${subject}' can not be specified without the 'issuerId' filter`
      );
    }, 180000);

    test('Listing audit entries filtered by a wildcard action should be supported', async () => {
      const testUser = await createTestUser(account, {
        access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
      });
      const testAccount = cloneWithAccessToken(account, testUser.accessToken);
      await Promise.all([addUser(testAccount, {}), addClient(testAccount, {})]);
      const now = Date.now();

      const audit = await listAudit(account, { issuerId: testUser.identities[0].issuerId, action: 'client:*' });
      expect(audit.status).toBe(200);
      expect(audit.data).toBeDefined();
      expect(audit.data.items).toBeDefined();
      expect(audit.data.items.length).toBe(1);
      for (const item of audit.data.items) {
        expect(item.issuerId).toBe(testUser.identities[0].issuerId);
        expect(item.subject).toBe(testUser.identities[0].subject);
        expect(item.accountId).toBe(testAccount.accountId);

        const timestamp = new Date(item.timestamp).getTime();
        expect(timestamp).toBeGreaterThan(now - 10000);
        expect(timestamp).toBeLessThan(now + 10000);

        expect(item.action).toBe('client:add');
        expect(item.authorized).toBe(false);
        expect(item.resource).toBe(`/account/${testAccount.accountId}/client/`);
      }
    }, 180000);

    test('Listing audit entries filtered by a full action should be supported', async () => {
      const testUser = await createTestUser(account, {
        access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
      });
      const testAccount = cloneWithAccessToken(account, testUser.accessToken);
      await Promise.all([addUser(testAccount, {}), addClient(testAccount, {})]);
      const now = Date.now();

      const audit = await listAudit(account, { issuerId: testUser.identities[0].issuerId, action: 'user:add' });
      expect(audit.status).toBe(200);
      expect(audit.data).toBeDefined();
      expect(audit.data.items).toBeDefined();
      expect(audit.data.items.length).toBe(1);
      for (const item of audit.data.items) {
        expect(item.issuerId).toBe(testUser.identities[0].issuerId);
        expect(item.subject).toBe(testUser.identities[0].subject);
        expect(item.accountId).toBe(testAccount.accountId);

        const timestamp = new Date(item.timestamp).getTime();
        expect(timestamp).toBeGreaterThan(now - 10000);
        expect(timestamp).toBeLessThan(now + 10000);

        expect(item.action).toBe('user:add');
        expect(item.authorized).toBe(true);
        expect(item.resource).toBe(`/account/${testAccount.accountId}/user/`);
      }
    }, 180000);

    test('Listing audit entries filtered by resource should be supported', async () => {
      const testUser = await createTestUser(account, {
        access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
      });
      const testAccount = cloneWithAccessToken(account, testUser.accessToken);
      await Promise.all([addUser(testAccount, {}), addClient(testAccount, {})]);
      const now = Date.now();

      const audit = await listAudit(account, {
        issuerId: testUser.identities[0].issuerId,
        resource: `/account/${account.accountId}/user`,
      });

      expect(audit.status).toBe(200);
      expect(audit.data).toBeDefined();
      expect(audit.data.items).toBeDefined();
      expect(audit.data.items.length).toBe(1);

      for (const item of audit.data.items) {
        expect(item.issuerId).toBe(testUser.identities[0].issuerId);
        expect(item.subject).toBe(testUser.identities[0].subject);
        expect(item.accountId).toBe(testAccount.accountId);

        const timestamp = new Date(item.timestamp).getTime();
        expect(timestamp).toBeGreaterThan(now - 10000);
        expect(timestamp).toBeLessThan(now + 10000);

        expect(item.action).toBe('user:add');
        expect(item.authorized).toBe(true);
        expect(item.resource).toBe(`/account/${testAccount.accountId}/user/`);
      }
    }, 180000);

    test('Listing audit entries filtered by from using a relative time should be supported', async () => {
      const testUser = await createTestUser(account, {
        access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
      });
      const testAccount = cloneWithAccessToken(account, testUser.accessToken);

      await addUser(testAccount, {});
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await addUser(testAccount, {});
      const now = Date.now();

      const audit = await listAudit(account, { issuerId: testUser.identities[0].issuerId, from: '-5s' });

      expect(audit.status).toBe(200);
      expect(audit.data).toBeDefined();
      expect(audit.data.items).toBeDefined();
      expect(audit.data.items.length).toBe(1);

      for (const item of audit.data.items) {
        expect(item.issuerId).toBe(testUser.identities[0].issuerId);
        expect(item.subject).toBe(testUser.identities[0].subject);
        expect(item.accountId).toBe(testAccount.accountId);

        const timestamp = new Date(item.timestamp).getTime();
        expect(timestamp).toBeGreaterThan(now - 10000);
        expect(timestamp).toBeLessThan(now + 10000);

        expect(item.action).toBe('user:add');
        expect(item.authorized).toBe(true);
        expect(item.resource).toBe(`/account/${testAccount.accountId}/user/`);
      }
    }, 180000);

    test('Listing audit entries filtered by to using a relative time should be supported', async () => {
      const testUser = await createTestUser(account, {
        access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
      });
      const testAccount = cloneWithAccessToken(account, testUser.accessToken);

      await addUser(testAccount, {});
      const now = Date.now();

      await new Promise((resolve) => setTimeout(resolve, 10000));
      await addUser(testAccount, {});

      const audit = await listAudit(account, { issuerId: testUser.identities[0].issuerId, to: '-5s' });

      expect(audit.status).toBe(200);
      expect(audit.data).toBeDefined();
      expect(audit.data.items).toBeDefined();
      expect(audit.data.items.length).toBe(1);

      for (const item of audit.data.items) {
        expect(item.issuerId).toBe(testUser.identities[0].issuerId);
        expect(item.subject).toBe(testUser.identities[0].subject);
        expect(item.accountId).toBe(testAccount.accountId);

        const timestamp = new Date(item.timestamp).getTime();
        expect(timestamp).toBeGreaterThan(now - 10000);
        expect(timestamp).toBeLessThan(now + 10000);

        expect(item.action).toBe('user:add');
        expect(item.authorized).toBe(true);
        expect(item.resource).toBe(`/account/${testAccount.accountId}/user/`);
      }
    }, 180000);

    test('Listing audit entries filtered by from and to using a relative time should be supported', async () => {
      const testUser = await createTestUser(account, {
        access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
      });
      const testAccount = cloneWithAccessToken(account, testUser.accessToken);

      await addUser(testAccount, {});
      await new Promise((resolve) => setTimeout(resolve, 10000));

      await addUser(testAccount, {});
      const now = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 10000));

      await addUser(testAccount, {});

      const audit = await listAudit(account, { issuerId: testUser.identities[0].issuerId, from: '-15s', to: '-5s' });

      expect(audit.status).toBe(200);
      expect(audit.data).toBeDefined();
      expect(audit.data.items).toBeDefined();
      expect(audit.data.items.length).toBe(1);

      for (const item of audit.data.items) {
        expect(item.issuerId).toBe(testUser.identities[0].issuerId);
        expect(item.subject).toBe(testUser.identities[0].subject);
        expect(item.accountId).toBe(testAccount.accountId);

        const timestamp = new Date(item.timestamp).getTime();
        expect(timestamp).toBeGreaterThan(now - 10000);
        expect(timestamp).toBeLessThan(now + 10000);

        expect(item.action).toBe('user:add');
        expect(item.authorized).toBe(true);
        expect(item.resource).toBe(`/account/${testAccount.accountId}/user/`);
      }
    }, 180000);

    test('Listing audit entries filtered by from and to using Date.getTime() should be supported', async () => {
      const testUser = await createTestUser(account, {
        access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
      });
      const testAccount = cloneWithAccessToken(account, testUser.accessToken);

      await addUser(testAccount, {});
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const from = Date.now().toString();
      await new Promise((resolve) => setTimeout(resolve, 5000));

      await addUser(testAccount, {});
      const now = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const to = Date.now().toString();
      await new Promise((resolve) => setTimeout(resolve, 5000));

      await addUser(testAccount, {});

      const audit = await listAudit(account, { issuerId: testUser.identities[0].issuerId, from, to });

      expect(audit.status).toBe(200);
      expect(audit.data).toBeDefined();
      expect(audit.data.items).toBeDefined();
      expect(audit.data.items.length).toBe(1);

      for (const item of audit.data.items) {
        expect(item.issuerId).toBe(testUser.identities[0].issuerId);
        expect(item.subject).toBe(testUser.identities[0].subject);
        expect(item.accountId).toBe(testAccount.accountId);

        const timestamp = new Date(item.timestamp).getTime();
        expect(timestamp).toBeGreaterThan(now - 10000);
        expect(timestamp).toBeLessThan(now + 10000);

        expect(item.action).toBe('user:add');
        expect(item.authorized).toBe(true);
        expect(item.resource).toBe(`/account/${testAccount.accountId}/user/`);
      }
    }, 180000);

    test('Listing audit entries filtered by from and to using ISO dates should be supported', async () => {
      const testUser = await createTestUser(account, {
        access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
      });
      const testAccount = cloneWithAccessToken(account, testUser.accessToken);

      await addUser(testAccount, {});
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const from = new Date().toISOString();
      await new Promise((resolve) => setTimeout(resolve, 5000));

      await addUser(testAccount, {});
      const now = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const to = new Date().toISOString();
      await new Promise((resolve) => setTimeout(resolve, 5000));

      await addUser(testAccount, {});

      const audit = await listAudit(account, { issuerId: testUser.identities[0].issuerId, from, to });

      expect(audit.status).toBe(200);
      expect(audit.data).toBeDefined();
      expect(audit.data.items).toBeDefined();
      expect(audit.data.items.length).toBe(1);

      for (const item of audit.data.items) {
        expect(item.issuerId).toBe(testUser.identities[0].issuerId);
        expect(item.subject).toBe(testUser.identities[0].subject);
        expect(item.accountId).toBe(testAccount.accountId);

        const timestamp = new Date(item.timestamp).getTime();
        expect(timestamp).toBeGreaterThan(now - 10000);
        expect(timestamp).toBeLessThan(now + 10000);

        expect(item.action).toBe('user:add');
        expect(item.authorized).toBe(true);
        expect(item.resource).toBe(`/account/${testAccount.accountId}/user/`);
      }
    }, 180000);

    test('Listing audit entries filtered by from and to using UTC dates should be supported', async () => {
      const testUser = await createTestUser(account, {
        access: { allow: [{ action: 'user:*', resource: `/account/${account.accountId}` }] },
      });
      const testAccount = cloneWithAccessToken(account, testUser.accessToken);

      await addUser(testAccount, {});
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const from = new Date().toUTCString();
      await new Promise((resolve) => setTimeout(resolve, 5000));

      await addUser(testAccount, {});
      const now = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const to = new Date().toUTCString();
      await new Promise((resolve) => setTimeout(resolve, 5000));

      await addUser(testAccount, {});

      const audit = await listAudit(account, { issuerId: testUser.identities[0].issuerId, from, to });

      expect(audit.status).toBe(200);
      expect(audit.data).toBeDefined();
      expect(audit.data.items).toBeDefined();
      expect(audit.data.items.length).toBe(1);

      for (const item of audit.data.items) {
        expect(item.issuerId).toBe(testUser.identities[0].issuerId);
        expect(item.subject).toBe(testUser.identities[0].subject);
        expect(item.accountId).toBe(testAccount.accountId);

        const timestamp = new Date(item.timestamp).getTime();
        expect(timestamp).toBeGreaterThan(now - 10000);
        expect(timestamp).toBeLessThan(now + 10000);

        expect(item.action).toBe('user:add');
        expect(item.authorized).toBe(true);
        expect(item.resource).toBe(`/account/${testAccount.accountId}/user/`);
      }
    }, 180000);

    test('Listing audit entries filtered by from and to using relative minutes should be supported', async () => {
      const audit = await listAudit(account, { from: '-15m', to: '-5m' });

      expect(audit.status).toBe(200);
      expect(audit.data).toBeDefined();
      expect(audit.data.items).toBeDefined();
    }, 180000);

    test('Listing audit entries filtered by from and to using relative hours should be supported', async () => {
      const audit = await listAudit(account, { from: '-3h', to: '-1h' });

      expect(audit.status).toBe(200);
      expect(audit.data).toBeDefined();
      expect(audit.data.items).toBeDefined();
    }, 180000);

    test('Listing audit entries filtered by from and to using relative days should be supported', async () => {
      const audit = await listAudit(account, { from: '-2d', to: '-1d' });
      expect(audit.status).toBe(200);
      expect(audit.data).toBeDefined();
      expect(audit.data.items).toBeDefined();
    }, 180000);

    test('Listing audit entries filtered by from with an invalid date/time returns an error', async () => {
      const audit = await listAudit(account, { from: 'nope' });
      expectMore(audit).toBeHttpError(
        400,
        [
          "The 'from' filter date/time 'nope' is invalid.",
          "Specify an absolute date/time, or a relative time such as '-15m', '-2h', or '-6d'",
        ].join(' ')
      );
    }, 180000);

    test('Listing audit entries filtered by to with an invalid date/time returns an error', async () => {
      const audit = await listAudit(account, { to: 'blah' });
      expectMore(audit).toBeHttpError(
        400,
        [
          "The 'to' filter date/time 'blah' is invalid.",
          "Specify an absolute date/time, or a relative time such as '-15m', '-2h', or '-6d'",
        ].join(' ')
      );
    }, 180000);

    test('Listing audit entries filtered with a larger to than from returns an error', async () => {
      const audit = await listAudit(account, { from: '-5m', to: '-10m' });
      expect(audit.status).toBe(400);
      expect(audit.data.status).toBe(400);
      expect(audit.data.statusCode).toBe(400);
      expect(audit.data.message.indexOf("must be later in time than the 'from' filter")).toBeGreaterThan(0);
    }, 180000);

    test('Listing audit entries filtered by an invalid action should return an error', async () => {
      const audit = await listAudit(account, { action: 'client' });
      expectMore(audit).toBeHttpError(400, `The 'action' filter 'client' is invalid`);
    }, 180000);

    test('Listing audit entries with a malformed account should return an error', async () => {
      const malformed = await getMalformedAccount();
      const audit = await listAudit(malformed);
      expectMore(audit).toBeMalformedAccountError(malformed.accountId);
    }, 180000);

    test('Listing audit entries with a non-existing account should return an error', async () => {
      const audit = await listAudit(await getNonExistingAccount());
      expectMore(audit).toBeUnauthorizedError();
    }, 180000);
  });
});
