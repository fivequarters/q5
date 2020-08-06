import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
process.env.LOGS_DISABLE = 'true';

import { manage_tags } from '@5qtrs/function-lambda';

import { DynamoDB } from 'aws-sdk';
const dynamo = new DynamoDB({ apiVersion: '2012-08-10' });

interface IExpected {
  [index: string]: any;
}

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
    accountId: 'acc-1111',
    subscriptionId: 'sub-2222',
    boundaryId: 'bound-3333',
    functionId: 'func-4444',
  },
  {
    accountId: 'acc-1111',
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
    };

    expect(manage_tags.convert_spec_to_tags(funcSpecs[0])).toStrictEqual(expected);
  }, 10000);

  test('spec to request', async () => {
    const req = manage_tags.create_function_tag_request(funcOptions[0], {}, funcSpecs[0]);

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
      expect(item.key.S).toContain(item.tagKey.S);
      if (item.tagValue.S) {
        expect(item.key.S).toContain(item.tagValue.S);
      }
      if (item.tagValue.N) {
        expect(item.key.S).toContain(item.tagValue.N);
      }
      if (item.tagValue.BOOL) {
        expect(item.key.S).toContain(item.tagValue.N);
      }

      // Expect the various promoted attributes
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
  }, 10000);

  test('request noop', async () => {
    // No items should be created as no changes are necessary.
    let req = manage_tags.create_function_tag_request(funcOptions[0], funcSpecs[0], funcSpecs[0]);
    expect(req.length).toBe(0);
    req = manage_tags.create_function_tag_request(funcOptions[0], {}, {});
    expect(req.length).toBe(0);
  }, 10000);

  test('spec1 to spec2', async () => {
    const req = manage_tags.create_function_tag_request(funcOptions[0], funcSpecs[0], funcSpecs[1]);

    const optBoundaryPre = [funcOptions[0].accountId, funcOptions[0].subscriptionId, funcOptions[0].boundaryId];
    const optBoundaryPost = [funcOptions[0].functionId];
    const optSubPre = [funcOptions[0].accountId, funcOptions[0].subscriptionId];
    const optSubPost = [funcOptions[0].boundaryId, funcOptions[0].functionId];
    const makeExpectOp = (key: any, value: any) => [
      ['function-tags-boundary', ...optBoundaryPre, key, value, ...optBoundaryPost].join(manage_tags.TAG_SEP),
      ['function-tags-subscription', ...optSubPre, key, value, ...optSubPost].join(manage_tags.TAG_SEP),
    ];

    const expected: IExpected = {
      DeleteRequest: [
        ...makeExpectOp(manage_tags.get_compute_tag_key('timeout'), 30),
        ...makeExpectOp(manage_tags.get_metadata_tag_key('master_user'), 'link'),
        ...makeExpectOp(manage_tags.get_metadata_tag_key('master_owner'), 'zelda'),
        ...makeExpectOp(manage_tags.get_metadata_tag_key('level'), 9001),
        ...makeExpectOp(manage_tags.get_metadata_tag_key('flies'), ''),
        ...makeExpectOp(manage_tags.get_dependency_tag_key('ms'), '2.1.2'),
      ],
      PutRequest: [
        ...makeExpectOp(manage_tags.get_compute_tag_key('timeout'), 0),
        ...makeExpectOp(manage_tags.get_metadata_tag_key('master_user'), 'thor'),
        ...makeExpectOp(manage_tags.get_metadata_tag_key('level'), 1),
        ...makeExpectOp(manage_tags.get_metadata_tag_key('nani'), true),
        ...makeExpectOp(manage_tags.get_dependency_tag_key('ms'), '2.1.3'),
      ],
    };

    const makeExpectReq: IExpected = {
      DeleteRequest: (r: any) => `${[r.Key.category.S, r.Key.key.S].join(manage_tags.TAG_SEP)}`,
      PutRequest: (r: any) => `${[r.Item.category.S, r.Item.key.S].join(manage_tags.TAG_SEP)}`,
    };

    const findOp = (op: any) => {
      const opType = Object.keys(op)[0];
      expect(expected[opType]).toContain(makeExpectReq[opType](op[opType]));
      expected[opType] = expected[opType].filter((e: any) => e !== makeExpectReq[opType](op[opType]));
    };

    req.forEach(findOp);

    expect(expected.DeleteRequest.length).toBe(0);
    expect(expected.PutRequest.length).toBe(0);
  }, 10000);

  test('dynamo tests', async () => {
    const makePre = (o: any, b: boolean) =>
      b ? [o.accountId, o.subscriptionId, o.boundaryId] : [o.accountId, o.subscriptionId];
    const makePost = (o: any, b: boolean) => (b ? [o.functionId] : [o.boundaryId, o.functionId]);

    const makeExpected = (o: any, key: any, value: any) => [
      ['function-tags-boundary', ...makePre(o, true), key, value, ...makePost(o, true)].join(manage_tags.TAG_SEP),
      ['function-tags-subscription', ...makePre(o, false), key, value, ...makePost(o, false)].join(manage_tags.TAG_SEP),
    ];

    const makeEntry = (e: any) => `${[e.category.S, e.key.S].join(manage_tags.TAG_SEP)}`;

    let expected: any;
    const findEntry = (entry: any) => {
      const flatEntry = makeEntry(entry);
      expect(expected).toContain(flatEntry);
      expected = expected.filter((e: any) => e !== flatEntry);
    };

    const validateEandD = (e: any, d: any) => {
      expect(e).toBeNull();
      expect(d.Items).toBeDefined();
      if (!d.Items) {
        return;
      }

      // Make sure we filter out anything that doesn't match this.
      d.Items = d.Items.filter(
        (i: any) =>
          (i.category.S === manage_tags.TAG_CATEGORY_BOUNDARY ||
            i.category.S === manage_tags.TAG_CATEGORY_SUBSCRIPTION) &&
          i.boundaryId.S === funcOptions[0].boundaryId
      );
      expect(d.Items.length).toBeDefined();
    };

    const scanParams = {
      TableName: manage_tags.keyValueTableName,
    };

    // Delete any old lingering entries.
    await new Promise((resolve, reject) => {
      dynamo.scan(scanParams, async (e, d) => {
        if (!d.Items) {
          return;
        }
        validateEandD(e, d);
        for (const item of d.Items) {
          await new Promise((res, rej) =>
            dynamo.deleteItem(
              {
                TableName: manage_tags.keyValueTableName,
                Key: { category: { S: item.category.S }, key: { S: item.key.S } },
              },
              res
            )
          );
        }
        resolve();
      });
    });

    // Add two different functions worth of tags.
    await new Promise((resolve, reject) => manage_tags.create_function_tags(funcOptions[0], funcSpecs[0], resolve));
    await new Promise((resolve, reject) => manage_tags.create_function_tags(funcOptions[1], funcSpecs[0], resolve));

    // Check to make sure the items are present.
    await new Promise((resolve, reject) => {
      dynamo.scan(scanParams, (e, d) => {
        validateEandD(e, d);
        if (!d.Items) {
          return;
        }
        const byOption = (o: any) => [
          ...makeExpected(o, manage_tags.get_compute_tag_key('timeout'), funcSpecs[0].compute.timeout),
          ...makeExpected(o, manage_tags.get_compute_tag_key('staticIp'), funcSpecs[0].compute.staticIp),
          ...makeExpected(o, manage_tags.get_metadata_tag_key('master_user'), funcSpecs[0].metadata.tags.master_user),
          ...makeExpected(o, manage_tags.get_metadata_tag_key('master_owner'), funcSpecs[0].metadata.tags.master_owner),
          ...makeExpected(o, manage_tags.get_metadata_tag_key('level'), funcSpecs[0].metadata.tags.level),
          ...makeExpected(o, manage_tags.get_metadata_tag_key('flies'), ''),
          ...makeExpected(o, manage_tags.get_dependency_tag_key('ms'), funcSpecs[0].internal.resolved_dependencies.ms),
        ];
        expected = [...byOption(funcOptions[0]), ...byOption(funcOptions[1])];
        d.Items.forEach(findEntry);
        expect(expected.length).toBe(0);

        resolve();
      });
    });

    // Update one functions tags.
    await new Promise((resolve, reject) =>
      manage_tags.update_function_tags(funcOptions[1], funcSpecs[0], funcSpecs[1], resolve)
    );

    // Remove the other functions tags.
    await new Promise((resolve, reject) => manage_tags.delete_function_tags(funcOptions[0], funcSpecs[0], resolve));

    // Check to make sure the items are present.
    await new Promise((resolve, reject) => {
      dynamo.scan(scanParams, (e, d) => {
        validateEandD(e, d);
        if (!d.Items) {
          return;
        }
        const o = funcOptions[1];
        const s = funcSpecs[1];
        expected = [
          ...makeExpected(o, manage_tags.get_compute_tag_key('timeout'), s.compute.timeout),
          ...makeExpected(o, manage_tags.get_compute_tag_key('staticIp'), s.compute.staticIp),
          ...makeExpected(o, manage_tags.get_metadata_tag_key('master_user'), s.metadata.tags.master_user),
          ...makeExpected(o, manage_tags.get_metadata_tag_key('level'), s.metadata.tags.level),
          ...makeExpected(o, manage_tags.get_metadata_tag_key('nani'), s.metadata.tags.nani),
          ...makeExpected(o, manage_tags.get_dependency_tag_key('ms'), s.internal.resolved_dependencies.ms),
        ];

        d.Items.forEach(findEntry);
        expect(expected.length).toBe(0);

        resolve();
      });
    });

    // Delete the last entries to leave the state clean.
    await new Promise((resolve, reject) => manage_tags.delete_function_tags(funcOptions[1], funcSpecs[1], resolve));

    // Make sure there's no lingering entries.
    await new Promise((resolve, reject) => {
      dynamo.scan(scanParams, async (e, d) => {
        if (!d.Items) {
          return;
        }
        validateEandD(e, d);
        expect(d.Items.length).toBe(0);

        resolve();
      });
    });
  }, 10000);
});
