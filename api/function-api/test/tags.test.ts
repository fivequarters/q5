import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
process.env.LOGS_DISABLE = 'true';

import { manage_tags } from '@5qtrs/function-lambda';

const minSpec = {
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
};

const standardOptions = {
  accountId: 'acc-1111',
  subscriptionId: 'sub-2222',
  boundaryId: 'bound-3333',
  functionId: 'func-4444',
};

describe('manage_tags', () => {
  test('spec to tags', async () => {
    const expected = {
      'compute.timeout': 30,
      'compute.staticIp': false,
      'dependency.ms': '2.1.2',
      'tag.master_user': 'link',
      'tag.master_owner': 'zelda',
      'tag.level': 9001,
      'tag.flies': null,
    };

    expect(manage_tags.convert_spec_to_tags(minSpec)).toStrictEqual(expected);
  }, 10000);

  test('spec to request', async () => {
    const req = manage_tags.create_function_tag_request(standardOptions, {}, minSpec);

    // Make sure that the expected number of request objects are created, for both boundary and subscription
    // search criteria, per the number of tags created.
    expect(req.RequestItems[manage_tags.keyValueTableName].length).toBe(
      Object.keys(manage_tags.convert_spec_to_tags(minSpec)).length * 2
    );

    req.RequestItems[manage_tags.keyValueTableName].forEach((r: any) => {
      const item = r.PutRequest.Item;

      // Make sure it's one of the expected categories.
      expect([manage_tags.TAG_CATEGORY_BOUNDARY, manage_tags.TAG_CATEGORY_SUBSCRIPTION]).toContain(item.category.S);

      // Make sure the key always contains the full spec.
      expect(item.key.S).toContain(standardOptions.accountId);
      expect(item.key.S).toContain(standardOptions.subscriptionId);
      expect(item.key.S).toContain(standardOptions.boundaryId);
      expect(item.key.S).toContain(standardOptions.functionId);
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
      expect(item.functionId.S).toBe(standardOptions.functionId);
      expect(item.boundaryId.S).toBe(standardOptions.boundaryId);

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
    let req = manage_tags.create_function_tag_request(standardOptions, minSpec, minSpec);
    expect(req.RequestItems[manage_tags.keyValueTableName].length).toBe(0);
    req = manage_tags.create_function_tag_request(standardOptions, {}, {});
    expect(req.RequestItems[manage_tags.keyValueTableName].length).toBe(0);
  }, 10000);
});
