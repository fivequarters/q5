import * as Constants from '@5qtrs/constants';

import * as Tags from '@5qtrs/function-tags';

const TD = Tags.Dynamo;

import { DynamoDB } from 'aws-sdk';
const dynamo = new DynamoDB({ apiVersion: '2012-08-10' });

const funcSpecs = [
  {
    accountId: 'acc-9999',
    subscriptionId: 'sub-2222',
    boundaryId: 'bound-3333',
    functionId: 'func-4444',
    compute: { timeout: 30, staticIp: false },
    metadata: {
      tags: {
        master_user: 'link',
        master_owner: 'zelda',
        level: 9001,
        flies: null,
      },
    },
    internal: {
      dependencies: { ms: '^0.7.2' },
      resolved_dependencies: { ms: '0.7.3' },
    },
  },
  {
    accountId: 'acc-9999',
    subscriptionId: 'sub-2222',
    boundaryId: 'bound-3333',
    functionId: 'func-4444',
    compute: {
      timeout: 0, // Change to a logic-false value.
      staticIp: false, // Remain the same.
    },
    metadata: {
      tags: {
        master_user: 'thor', // Different string
        // master_owner: 'gojira',  // Removed
        level: 1, // New value
        nani: true, // New entry
        // flies: null,       // Removed; null will always be a weird one.
      },
    },
    internal: {
      dependencies: { ms: '*' },
      resolved_dependencies: { ms: '2.1.2' }, // Bump version number.
    },
  },
];

const mustacheSpec = {
  accountId: 'acc-9999',
  subscriptionId: 'sub-2222',
  boundaryId: 'bound-3333',
  functionId: 'func-4444',
  security: {
    functionPermissions: {
      allow: [{ action: 'function:put', resource: '/{{fusebit.accountId}}/a/' }],
    },
    authorization: [{ action: 'function:put', resource: '/{{accountId}}/b/' }],
  },
};

const funcOptions = [
  {
    accountId: 'acc-9999',
    subscriptionId: 'sub-2222',
    boundaryId: 'bound-3333',
    functionId: 'func-4444',
  },
  {
    accountId: 'acc-9999',
    subscriptionId: 'sub-2222',
    boundaryId: 'bound-3333',
    functionId: 'func-5555',
  },
];

describe('Tags', () => {
  test('spec to tags', async () => {
    const expected = {
      [Constants.get_fusebit_tag_key('accountId')]: funcSpecs[0].accountId,
      [Constants.get_fusebit_tag_key('subscriptionId')]: funcSpecs[0].subscriptionId,
      [Constants.get_fusebit_tag_key('boundaryId')]: funcSpecs[0].boundaryId,
      [Constants.get_fusebit_tag_key('functionId')]: funcSpecs[0].functionId,
      [Constants.get_compute_tag_key('timeout')]: funcSpecs[0].compute.timeout,
      [Constants.get_compute_tag_key('staticIp')]: funcSpecs[0].compute.staticIp,
      [Constants.get_dependency_tag_key('version.ms')]: funcSpecs[0].internal.resolved_dependencies.ms,
      [Constants.get_dependency_tag_key('semver.ms')]: funcSpecs[0].internal.dependencies.ms,
      [Constants.get_dependency_tag_key('registry.ms')]: Constants.MODULE_PUBLIC_REGISTRY,
      [Constants.get_metadata_tag_key('master_user')]: funcSpecs[0].metadata.tags.master_user,
      [Constants.get_metadata_tag_key('master_owner')]: funcSpecs[0].metadata.tags.master_owner,
      [Constants.get_metadata_tag_key('level')]: funcSpecs[0].metadata.tags.level,
      [Constants.get_metadata_tag_key('flies')]: funcSpecs[0].metadata.tags.flies,
      [Constants.get_security_tag_key('authentication')]: 'none',
      ['cron']: false,
    };

    expect(Tags.Constants.convert_spec_to_tags(funcSpecs[0])).toStrictEqual(expected);
  }, 120000);

  test('mustache spec', async () => {
    const expected = {
      [Constants.get_fusebit_tag_key('accountId')]: mustacheSpec.accountId,
      [Constants.get_fusebit_tag_key('subscriptionId')]: mustacheSpec.subscriptionId,
      [Constants.get_fusebit_tag_key('boundaryId')]: mustacheSpec.boundaryId,
      [Constants.get_fusebit_tag_key('functionId')]: mustacheSpec.functionId,
      ['cron']: false,
      [Constants.get_security_tag_key('authentication')]: 'none',
      [Constants.get_security_tag_key('permissions')]: JSON.stringify({
        allow: [{ action: 'function:put', resource: `/${mustacheSpec.accountId}/a/` }],
      }),
      [Constants.get_security_tag_key('authorization')]: JSON.stringify([
        { action: 'function:put', resource: `/${mustacheSpec.accountId}/b/` },
      ]),
    };
    expect(Tags.Constants.convert_spec_to_tags(mustacheSpec)).toStrictEqual(expected);
  }, 180000);

  test('spec to request', async () => {
    const req = TD.get_dynamo_create_request(funcOptions[0], funcSpecs[0]);

    // Make sure that the expected number of request objects are created, for both boundary and subscription
    // search criteria, per the number of tags created.
    expect(req.length).toBe(1);

    req.forEach((r: any) => {
      const item = r.PutRequest.Item;

      // Make sure it's the expected category.
      expect([Tags.Constants.TAG_CATEGORY_FUNCTION]).toContain(item.category.S);

      // Make sure the key always contains the full spec.
      expect(item.key.S).toContain(funcOptions[0].accountId);
      expect(item.key.S).toContain(funcOptions[0].subscriptionId);
      expect(item.key.S).toContain(funcOptions[0].boundaryId);
      expect(item.key.S).toContain(funcOptions[0].functionId);

      // Expect the various promoted attributes
      expect(item.accountId.S).toBe(funcOptions[0].accountId);
      expect(item.subscriptionId.S).toBe(funcOptions[0].subscriptionId);
      expect(item.functionId.S).toBe(funcOptions[0].functionId);
      expect(item.boundaryId.S).toBe(funcOptions[0].boundaryId);

      if (item[Constants.get_metadata_tag_key('master_user')]) {
        expect(item[Constants.get_metadata_tag_key('master_user')].S).toBe(funcSpecs[0].metadata.tags.master_user);
      }
      if (item[Constants.get_metadata_tag_key('level')]) {
        expect(typeof item[Constants.get_metadata_tag_key('level')].N).toBe('string');
        expect(parseInt(item[Constants.get_metadata_tag_key('level')].N, 10)).toBe(funcSpecs[0].metadata.tags.level);
      }
      if (item[Constants.get_metadata_tag_key('flies')]) {
        expect(typeof item[Constants.get_metadata_tag_key('flies')].NULL).toBe('boolean');
        expect(item[Constants.get_metadata_tag_key('flies')].NULL).toBe(true);
      }
    });
  }, 120000);
});
