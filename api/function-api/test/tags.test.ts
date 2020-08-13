import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
process.env.LOGS_DISABLE = 'true';

import { manage_tags } from '@5qtrs/function-lambda';

import { DynamoDB } from 'aws-sdk';
const dynamo = new DynamoDB({ apiVersion: '2012-08-10' });

import { deleteAll, scanForTags } from './tags';

const funcSpecs = [
  {
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
      dependencies: { ms: '*' },
      resolved_dependencies: { ms: '2.1.2' },
    },
  },
  {
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
      resolved_dependencies: { ms: '2.1.3' }, // Bump version number.
    },
  },
];

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

describe('manage_tags', () => {
  test('spec to tags', async () => {
    const expected = {
      [manage_tags.get_compute_tag_key('timeout')]: funcSpecs[0].compute.timeout,
      [manage_tags.get_compute_tag_key('staticIp')]: funcSpecs[0].compute.staticIp,
      [manage_tags.get_dependency_tag_key('ms')]: funcSpecs[0].internal.resolved_dependencies.ms,
      [manage_tags.get_metadata_tag_key('master_user')]: funcSpecs[0].metadata.tags.master_user,
      [manage_tags.get_metadata_tag_key('master_owner')]: funcSpecs[0].metadata.tags.master_owner,
      [manage_tags.get_metadata_tag_key('level')]: funcSpecs[0].metadata.tags.level,
      [manage_tags.get_metadata_tag_key('flies')]: funcSpecs[0].metadata.tags.flies,
      ['cron']: false,
    };

    expect(manage_tags.convert_spec_to_tags(funcSpecs[0])).toStrictEqual(expected);
  }, 120000);

  test('spec to request', async () => {
    const req = manage_tags.get_dynamo_create_request(funcOptions[0], funcSpecs[0]);

    // Make sure that the expected number of request objects are created, for both boundary and subscription
    // search criteria, per the number of tags created.
    expect(req.length).toBe(Object.keys(manage_tags.convert_spec_to_tags(funcSpecs[0])).length * 2);

    req.forEach((r: any) => {
      const item = r.PutRequest.Item;

      // Make sure it's one of the expected categories.
      expect([manage_tags.TAG_CATEGORY_BOUNDARY, manage_tags.TAG_CATEGORY_SUBSCRIPTION]).toContain(item.category.S);

      // Make sure the key always contains the full spec.
      expect(item.key.S).toContain(funcOptions[0].accountId);
      expect(item.key.S).toContain(funcOptions[0].subscriptionId);
      expect(item.key.S).toContain(funcOptions[0].boundaryId);
      expect(item.key.S).toContain(funcOptions[0].functionId);
      expect(item.key.S).toContain(manage_tags.encode(item.tagKey.S));
      if (item.tagValue.S) {
        expect(item.key.S).toContain(manage_tags.encode(item.tagValue.S));
      }
      if (item.tagValue.N) {
        expect(item.key.S).toContain(manage_tags.encode(item.tagValue.N));
      }
      if (item.tagValue.BOOL) {
        expect(item.key.S).toContain(manage_tags.encode(item.tagValue.N));
      }

      // Expect the various promoted attributes
      expect(item.accountId.S).toBe(funcOptions[0].accountId);
      expect(item.subscriptionId.S).toBe(funcOptions[0].subscriptionId);
      expect(item.functionId.S).toBe(funcOptions[0].functionId);
      expect(item.boundaryId.S).toBe(funcOptions[0].boundaryId);

      // Check the tagKey and tagValue options selectively with different types.
      if (item.tagKey.S === manage_tags.get_metadata_tag_key('master_user')) {
        expect(typeof item.tagValue.S).toBe('string');
      }
      if (item.tagKey.S === manage_tags.get_metadata_tag_key('level')) {
        expect(typeof item.tagValue.N).toBe('string');
        expect(parseInt(item.tagValue.N, 10)).toBe(9001);
      }
      if (item.tagKey.S === manage_tags.get_metadata_tag_key('flies')) {
        expect(typeof item.tagValue.NULL).toBe('boolean');
        expect(item.tagValue.NULL).toBe(true);
      }
    });
  }, 120000);

  test('dynamo tests', async () => {
    // Delete any old lingering entries.
    await deleteAll(funcOptions[0].accountId, funcOptions[0].boundaryId);

    // Add two different functions worth of tags.
    expect(
      await new Promise((resolve, reject) => manage_tags.create_function_tags(funcOptions[0], funcSpecs[0], resolve))
    ).toBeFalsy();
    expect(
      await new Promise((resolve, reject) => manage_tags.create_function_tags(funcOptions[1], funcSpecs[0], resolve))
    ).toBeFalsy();

    // Check to make sure the items are present.
    const expectedTags = {
      [manage_tags.get_compute_tag_key('timeout')]: funcSpecs[0].compute.timeout,
      [manage_tags.get_compute_tag_key('staticIp')]: funcSpecs[0].compute.staticIp,
      [manage_tags.get_metadata_tag_key('master_user')]: funcSpecs[0].metadata.tags.master_user,
      [manage_tags.get_metadata_tag_key('master_owner')]: funcSpecs[0].metadata.tags.master_owner,
      [manage_tags.get_metadata_tag_key('level')]: funcSpecs[0].metadata.tags.level,
      [manage_tags.get_metadata_tag_key('flies')]: funcSpecs[0].metadata.tags.flies,
      [manage_tags.get_dependency_tag_key('ms')]: funcSpecs[0].internal.resolved_dependencies.ms,
      ['cron']: false,
    };
    await scanForTags(funcOptions.map((o) => [o, expectedTags]));

    // Update one functions tags.
    expect(
      await new Promise((resolve, reject) => manage_tags.create_function_tags(funcOptions[1], funcSpecs[1], resolve))
    ).toBeFalsy();

    // Remove the other functions tags.
    expect(
      await new Promise((resolve, reject) => manage_tags.delete_function_tags(funcOptions[0], resolve))
    ).toBeFalsy();

    await scanForTags([
      [
        funcOptions[1],
        {
          [manage_tags.get_compute_tag_key('timeout')]: funcSpecs[1].compute.timeout,
          [manage_tags.get_compute_tag_key('staticIp')]: funcSpecs[1].compute.staticIp,
          [manage_tags.get_metadata_tag_key('master_user')]: funcSpecs[1].metadata.tags.master_user,
          [manage_tags.get_metadata_tag_key('level')]: funcSpecs[1].metadata.tags.level,
          [manage_tags.get_metadata_tag_key('nani')]: funcSpecs[1].metadata.tags.nani,
          [manage_tags.get_dependency_tag_key('ms')]: funcSpecs[1].internal.resolved_dependencies.ms,
          ['cron']: false,
        },
      ],
    ]);

    // Delete the last entries to leave the state clean.
    await new Promise((resolve, reject) => manage_tags.delete_function_tags(funcOptions[1], resolve));
    await scanForTags([[funcOptions[0], {}]]);
  }, 120000);

  test('bulk tests', async () => {
    // Delete any old lingering entries.
    await deleteAll(funcOptions[0].accountId, funcOptions[0].boundaryId);

    // Make a copy
    const spec = JSON.parse(JSON.stringify(funcSpecs[0]));
    const options = funcOptions[0];

    // Add a bunch of parameters
    for (let i = 0; i < 100; i++) {
      spec.metadata.tags[`tag${i}`] = i;
    }

    // Add two different functions worth of tags.
    expect(
      await new Promise((resolve, reject) => manage_tags.create_function_tags(options, spec, resolve))
    ).toBeFalsy();

    // Check to make sure the items are present.
    const expectedTags = {
      [manage_tags.get_compute_tag_key('timeout')]: spec.compute.timeout,
      [manage_tags.get_compute_tag_key('staticIp')]: spec.compute.staticIp,
      [manage_tags.get_dependency_tag_key('ms')]: spec.internal.resolved_dependencies.ms,
      ['cron']: false,
    };
    for (const [key, value] of Object.entries(spec.metadata.tags)) {
      expectedTags[manage_tags.get_metadata_tag_key(key)] = value;
    }

    await scanForTags([[options, expectedTags]]);

    // Delete the last entries to leave the state clean.
    await new Promise((resolve, reject) => manage_tags.delete_function_tags(options, resolve));
    await scanForTags([[options, {}]]);
  }, 120000);
});
