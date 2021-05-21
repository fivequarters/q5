import { ApiRequestMap } from './sdk';

import { getEnv } from '../v1/setup';
import { IntegrationService } from '../../src/routes/service';
import { Model } from '@5qtrs/db';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

interface IntegrationRequestBody extends Model.IEntity {
  entityType: 'integration';
}

interface IntegrationDefinitions {
  IntegrationOne: IntegrationRequestBody;
}

const MakeIntegrationDefinitions = (executionCount: number): IntegrationDefinitions => ({
  IntegrationOne: {
    accountId: account.accountId,
    data: { testData: '123' },
    id: `Test-${executionCount}`,
    subscriptionId: account.subscriptionId,
    tags: { [`oneTag ${executionCount}`]: 'one value', [`twoTags ${executionCount}`]: 'two values' },
    entityType: 'integration',
  },
});
let executionCount = 0;
const IntegrationDefinitions = MakeIntegrationDefinitions(0);

const createIntegrationTest = async (integration: Model.IEntity = IntegrationDefinitions.IntegrationOne) => {
  const createResponse = await ApiRequestMap.integration.post(account, integration);
  expect(createResponse).toBeHttp({ statusCode: 200 });
  const listResponse = await ApiRequestMap.integration.list(account);
  expect(listResponse).toBeHttp({ statusCode: 200 });
  expect(listResponse.data).toBeDefined();
  expect(listResponse.data.items).toEqual([
    { ...integration, version: integration.version ? integration.version + 1 : 1 },
  ]);
  return listResponse.data.items[0];
};

describe.skip('Integration', () => {
  afterEach(async () => {
    const integrationService = new IntegrationService();
    try {
      const integrations = await integrationService.dao.listEntities({
        accountId: account.accountId,
        subscriptionId: account.subscriptionId,
      });
      await Promise.all(
        integrations.items.map((integration) => {
          integrationService.dao.deleteEntity(integration);
        })
      );
    } catch (e) {
      expect(e).toBeHttp({ statusCode: 404 });
    }
    Object.assign(IntegrationDefinitions, MakeIntegrationDefinitions(++executionCount));
  });
  test('List Integrations returns 404 when none exist', async () => {
    //const r = await listIntegrations(account);
    const response = await ApiRequestMap.integration.list(account);
    expect(response).toBeHttp({ statusCode: 404 });
  });
  test('Create Integration', async () => {
    await createIntegrationTest();
  });
  test('Create Integration returns 400 on conflict', async () => {
    await createIntegrationTest();
    const createResponseConflict = await ApiRequestMap.integration.post(account, IntegrationDefinitions.IntegrationOne);
    expect(createResponseConflict).toBeHttp({ status: 400 });
  });
  test('Update Integration', async () => {
    const IntegrationOne = await createIntegrationTest();
    const IntegrationOneUpdated = {
      ...IntegrationOne,
      data: { newData: 'abc' },
      tags: { newTag: 'efg' },
    };
    const updateResponse = await ApiRequestMap.integration.put(account, IntegrationOne.id, IntegrationOneUpdated);
    expect(updateResponse).toBeHttp({ statusCode: 200 });
    const getResponse = await ApiRequestMap.integration.get(account, IntegrationOne.id);
    expect(getResponse.data).toBeDefined();
    expect(getResponse.data).toEqual({ ...IntegrationOneUpdated, version: IntegrationOneUpdated.version + 1 });
  });
  test('Update Integration returns 404 if integration not found', async () => {
    const IntegrationOne = await createIntegrationTest();
    const IntegrationOneUpdated = {
      ...IntegrationOne,
      data: { newData: 'abc' },
      tags: { newTag: 'efg' },
      id: 'new name',
    };
    const updateResponse = await ApiRequestMap.integration.put(account, IntegrationOne.id, IntegrationOneUpdated);
    expect(updateResponse).toBeHttp({ statusCode: 404 });
  });

  test('Delete Integration', async () => {
    const IntegrationOne = await createIntegrationTest();
    const deleteResponse = await ApiRequestMap.integration.delete(account, IntegrationOne.id);
    expect(deleteResponse).toBeHttp({ statusCode: 200 });
    expect(deleteResponse.data).toBeTruthy();
    const getResponse = await ApiRequestMap.integration.get(account, IntegrationOne.id);
    expect(getResponse).toBeHttp({ statusCode: 404 });
  });
  test('Delete Integration returns false when not found', async () => {
    const deleteResponse = await ApiRequestMap.integration.delete(account, IntegrationDefinitions.IntegrationOne.id);
    expect(deleteResponse).toBeHttp({ statusCode: 200 });
    expect(deleteResponse.data).toBeFalsy();
  });

  test('Get Integration', async () => {
    const IntegrationOne = await createIntegrationTest();
    const getResponse = await ApiRequestMap.integration.get(account, IntegrationOne.id);
    expect(getResponse).toBeHttp({ statusCode: 200 });
    expect(getResponse.data).toEqual({ ...IntegrationOne, version: 1 });
  });
  test('Get Integration returns 404 when not found', async () => {
    const getResponse = await ApiRequestMap.integration.get(account, 'Bad Id');
    expect(getResponse).toBeHttp({ statusCode: 404 });
  });

  test('List Integrations, Paginated', async () => {
    const integrationCount = 10;
    const pages = 5;
    const limit = integrationCount / pages;
    const Integrations = Array(integrationCount)
      .fill(undefined)
      .map((val, index) => {
        return {
          ...IntegrationDefinitions.IntegrationOne,
          id: `Mapped-Integration-${index}`,
        };
      });
    await Promise.all(
      Integrations.map(async (integration) => await ApiRequestMap.integration.post(account, integration))
    );
    const fullListResponse = await ApiRequestMap.integration.list(account);
    expect(fullListResponse).toBeHttp({ statusCode: 200 });
    expect(fullListResponse.data.items).toHaveLength(integrationCount);

    let next, pageResponse;
    for (let page = 0; page < pages; page++) {
      pageResponse = await ApiRequestMap.integration.list(account, { limit, next });
      expect(pageResponse).toBeHttp({ statusCode: 200 });
      expect(pageResponse.data).toBeDefined();
      expect(pageResponse.data.items).toBeDefined();
      expect(pageResponse.data.items).toHaveLength(2);
      expect(pageResponse.data.items).toEqual([
        { ...Integrations[page * limit], version: 1 },
        { ...Integrations[page * limit + 1], version: 1 },
      ]);
      if (page < pages - 1) {
        expect(pageResponse.data.next).toBeDefined();
        next = pageResponse.data.next;
      }
    }
  });
  test('List Integrations by prefix', async () => {
    const integrationCount = 10;
    let sections = [
      {
        prefix: (index?: number) => `prefix1-${index || ''}`,
        size: 1,
        integrations: [],
      },
      {
        prefix: (index?: number) => `prefix2-${index || ''}`,
        size: 4,
        integrations: [],
      },
      {
        prefix: (index?: number) => `prefix3-${index || ''}`,
        size: 5,
        integrations: [],
      },
    ];

    const sectionsByIntegrationIndex = sections.flatMap((section: any) =>
      Array(section.size)
        .fill(section)
        .map((value, index) => ({
          ...section,
          prefix: section.prefix(index),
        }))
    );
    expect(sections.reduce((acc, cur) => acc + cur.size, 0)).toEqual(integrationCount);
    const Integrations = Array(integrationCount)
      .fill(undefined)
      .map((val, index) => {
        return {
          ...IntegrationDefinitions.IntegrationOne,
          id: sectionsByIntegrationIndex[index].prefix,
        };
      });
    await Promise.all(
      Integrations.map(async (integration) => await ApiRequestMap.integration.post(account, integration))
    );
    const fullListResponse = await ApiRequestMap.integration.list(account);
    expect(fullListResponse).toBeHttp({ statusCode: 200 });
    expect(fullListResponse.data.items).toHaveLength(integrationCount);

    await Promise.all(
      sections.map(async (section) => {
        const prefixResponse = await ApiRequestMap.integration.list(account, { idPrefix: section.prefix() });
        expect(prefixResponse).toBeHttp({ statusCode: 200 });
        expect(prefixResponse.data.items).toHaveLength(section.size);
        expect(prefixResponse.data.items).toEqual(
          Array(section.size)
            .fill(undefined)
            .map((value, index) => ({
              ...IntegrationDefinitions.IntegrationOne,
              id: section.prefix(index),
              version: 1,
            }))
        );
      })
    );
  });

  test('List Integrations By Tags', async () => {
    7;
    let sections = [
      {
        size: 1,
        tagOne: true,
        tagTwo: true,
        tagThree: true,
      },
      {
        size: 2,
        tagOne: true,
        tagTwo: true,
      },
      {
        size: 3,
        tagOne: true,
      },
      {
        size: 1,
      },
    ];
    const tagOne = (index: number) => ({ tagOne: index });
    const tagTwo = (index: number) => ({ tagTwo: index });
    const tagThree = (index: number) => ({ tagThree: index });
    const integrationCount = sections.reduce((acc, cur) => acc + cur.size, 0);

    const Integrations: Model.IEntity[] = sections.flatMap(
      (section: { size: number; tagOne?: boolean; tagTwo?: boolean; tagThree?: boolean }, sectionId: number) =>
        Array(section.size)
          .fill(undefined)
          .map((value, index) => ({
            ...IntegrationDefinitions.IntegrationOne,
            ...(section.tagOne && tagOne(index)),
            ...(section.tagTwo && tagTwo(index)),
            ...(section.tagThree && tagThree(index)),
            id: `${sectionId}_${index}`,
          }))
    );
    // map of tag count, to verify expected results; {tagKey: {tagValue: count} }
    const TagCountMap: { [key: string]: { [key: string]: number } } = Integrations.reduce(
      (acc: { [key: string]: { [key: string]: number } }, cur: Model.IEntity) => {
        if (typeof cur.tags === 'undefined') {
          return acc;
        }
        Object.keys(cur.tags).forEach((curTag) => {
          if (acc[curTag] === undefined) {
            acc[curTag] = {};
          }
          if (acc[curTag][cur.tags![curTag]] === undefined) {
            acc[curTag][cur.tags![curTag]] = 0;
          }
          acc[curTag][cur.tags![curTag]]++;
        });
        return acc;
      },
      {}
    );
    await Promise.all(
      Integrations.map(async (integration) => await ApiRequestMap.integration.post(account, integration))
    );
    const fullListResponse = await ApiRequestMap.integration.list(account);
    expect(fullListResponse).toBeHttp({ statusCode: 200 });
    expect(fullListResponse.data.items).toHaveLength(integrationCount);

    await Promise.all(
      Object.keys(TagCountMap).map(async (tagKey) => {
        const TagKeyOnlyCount = Object.values(TagCountMap[tagKey]).reduce((acc, cur) => acc + cur, 0);
        const tagKeyOnlyResponse = await ApiRequestMap.integration.list(account, { tag: { tagKey } });
        expect(tagKeyOnlyResponse).toBeHttp({ statusCode: 200 });
        expect(tagKeyOnlyResponse.data).toBeDefined();
        expect(tagKeyOnlyResponse.data.items).toHaveLength(TagKeyOnlyCount);

        await Promise.all(
          Object.keys(TagCountMap[tagKey]).map(async (tagValue) => {
            const TagKeyValueCount = TagCountMap[tagKey][tagValue];
            const tagKeyValueResponse = await ApiRequestMap.integration.list(account, { tag: { tagKey, tagValue } });
            expect(tagKeyValueResponse).toBeHttp({ statusCode: 200 });
            expect(tagKeyValueResponse.data).toBeDefined();
            expect(tagKeyValueResponse.data.items).toHaveLength(TagKeyValueCount);
          })
        );
      })
    );
  });

  test('Get Integration Tags', async () => {
    const IntegrationOne = await createIntegrationTest();
    const integrationTags = await ApiRequestMap.integration.tags.get(account, IntegrationOne.id);
    expect(integrationTags).toBeHttp({ statusCode: 200 });
    expect(integrationTags.data).toBeDefined();
    expect(integrationTags.data.tags).toEqual(IntegrationOne.tags);
  });
  test('Get Integration Tags returns 404 on not found', async () => {
    const integrationTags = await ApiRequestMap.integration.tags.get(account, 'bad id');
    expect(integrationTags).toBeHttp({ statusCode: 404 });
  });

  test('Get Integration Tag Value', async () => {
    const IntegrationOne = await createIntegrationTest();
    await Promise.all(
      Object.keys(IntegrationOne.tags).map(async (tagKey) => {
        const tagValue = await ApiRequestMap.integration.tags.get(account, IntegrationOne.id, tagKey);
        expect(tagValue).toBeHttp({ statusCode: 200 });
        expect(tagValue.data).toBeDefined();
        expect(String(tagValue.data)).toEqual(IntegrationOne.tags[tagKey]);
      })
    );
  });
  test('Get Integration Tag Value returns undefined on unset tag', async () => {
    const IntegrationOne = await createIntegrationTest();
    const tagValue = await ApiRequestMap.integration.tags.get(account, IntegrationOne.id, 'bad tag key');
    expect(tagValue).toBeHttp({ statusCode: 200 });
    expect(tagValue.data).toBeUndefined();
  });

  test('Delete Integration Tag', async () => {
    const IntegrationOne = await createIntegrationTest();
    await Promise.all(
      Object.keys(IntegrationOne.tags).map(async (tagKey) => {
        const tagValue = await ApiRequestMap.integration.tags.get(account, IntegrationOne.id, tagKey);
        expect(tagValue).toBeHttp({ statusCode: 200 });
        expect(tagValue.data).toBeDefined();
        expect(String(tagValue.data)).toEqual(IntegrationOne.tags[tagKey]);
      })
    );
    const ExpectedTags = { ...IntegrationOne.tags };
    const tagKeys = Object.keys(IntegrationOne.tags);
    for (let tagIndex = 0; tagIndex < tagKeys.length; tagIndex++) {
      let tagKey = tagKeys[tagIndex];
      delete ExpectedTags[tagKey];
      const deleteTagResponse = await ApiRequestMap.integration.tags.delete(account, IntegrationOne.id, tagKey);
      expect(deleteTagResponse).toBeHttp({ statusCode: 200 });
      expect(deleteTagResponse.data).toBeDefined();
      expect(deleteTagResponse.data.tags).toEqual(ExpectedTags);
    }
  });
  test('Delete Integration Tag with invalid tag key has no impact on tags', async () => {
    const IntegrationOne = await createIntegrationTest();
    const integrationTags = await ApiRequestMap.integration.tags.get(account, IntegrationOne.id);
    expect(integrationTags).toBeHttp({ statusCode: 200 });
    expect(integrationTags.data).toBeDefined();
    expect(integrationTags.data.tags).toEqual(IntegrationOne.tags);

    const deleteTagResponse = await ApiRequestMap.integration.tags.delete(account, IntegrationOne.id, 'bad tag key');
    expect(deleteTagResponse).toBeHttp({ statusCode: 200 });
    expect(deleteTagResponse.data).toEqual({ ...integrationTags.data, version: 2 });
  });

  test('Update Integration Tag', async () => {
    const IntegrationOne = await createIntegrationTest();
    const tagKey = 'tag key to insert';
    const tagValue = 'tag value to insert';
    const setTagResponse = await ApiRequestMap.integration.tags.put(account, IntegrationOne.id, tagKey, tagValue);
    expect(setTagResponse).toBeHttp({ statusCode: 200 });
    expect(setTagResponse.data).toBeDefined();
    expect(setTagResponse.data.tags).toEqual({ ...IntegrationOne.tags, [tagKey]: tagValue });

    const getIntegrationResponse = await ApiRequestMap.integration.get(account, IntegrationOne.id);
    expect(getIntegrationResponse).toBeHttp({ statusCode: 200 });
    expect(getIntegrationResponse.data).toBeDefined();
    expect(getIntegrationResponse.data).toEqual({
      ...IntegrationOne,
      version: 2,
      tags: { ...IntegrationOne.tags, [tagKey]: tagValue },
    });
  });
  test('Update Integration Tag returns 404 on not found', async () => {
    const tagKey = 'tag key to insert';
    const tagValue = 'tag value to insert';
    const setTagResponse = await ApiRequestMap.integration.tags.put(account, 'bad integration Id', tagKey, tagValue);
    expect(setTagResponse).toBeHttp({ statusCode: 404 });
  });
});
