import { Model } from '@5qtrs/db';

import { cleanupEntities, ApiRequestMap } from './sdk';
import { callFunction, getFunctionLocation } from '../v1/sdk';

import { getEnv } from '../v1/setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

interface IConnectorRequestBody extends Model.IEntity {
  entityType: 'connector';
}

const newId = (wart: string): string => `${boundaryId}-${wart}-${Math.floor(Math.random() * 99999999).toString(8)}`;

const getIdPrefix = () => ({ idPrefix: boundaryId });

const makeConnector = (): IConnectorRequestBody => ({
  accountId: account.accountId,
  data: { testData: '123' },
  id: newId('Test'),
  subscriptionId: account.subscriptionId,
  tags: { [`oneTag`]: 'one value', [`twoTags`]: 'two values' },
  entityType: 'connector',
});

const remVersion = (connector: IConnectorRequestBody) => {
  const { version, ...newConnector } = connector;
  return newConnector;
};

const createConnectorTest = async (connector: Model.IEntity) => {
  const createResponse = await ApiRequestMap.connector.post(account, connector);
  expect(createResponse).toBeHttp({ statusCode: 202 });
  const operation = await ApiRequestMap.operation.waitForCompletion(account, createResponse.data.operationId);
  expect(operation).toBeHttp({ statusCode: 200 });
  const listResponse = await ApiRequestMap.connector.list(account, getIdPrefix());
  expect(listResponse).toBeHttp({ statusCode: 200 });
  expect(listResponse.data).toBeDefined();
  expect(listResponse.data.items).toMatchObject([connector]);
  expect(listResponse.data.items[0].version).toBeUUID();
  return listResponse.data.items[0];
};

describe('Connector', () => {
  afterAll(async () => {
    await cleanupEntities(account);
  });

  test('List Connectors returns 404 when none exist', async () => {
    const response = await ApiRequestMap.connector.list(account, getIdPrefix());
    expect(response).toBeHttp({ statusCode: 404 });
  });

  test('Create Connector', async () => {
    await createConnectorTest(makeConnector());
  });

  test('Create Connector returns 400 on conflict', async () => {
    const connector = makeConnector();
    await createConnectorTest(connector);
    const createResponseConflict = await ApiRequestMap.connector.post(account, connector);
    expect(createResponseConflict).toBeHttp({ status: 400 });
  });

  test('Update Connector', async () => {
    const connectorOne = await createConnectorTest(makeConnector());
    const connectorOneUpdated = {
      ...connectorOne,
      data: { newData: 'abc' },
      tags: { newTag: 'efg' },
    };
    const updateResponse = await ApiRequestMap.connector.putAndWait(account, connectorOne.id, connectorOneUpdated);
    expect(updateResponse).toBeHttp({ statusCode: 200 });
    const getResponse = await ApiRequestMap.connector.get(account, connectorOne.id);
    expect(getResponse.data).toBeDefined();
    expect(getResponse.data).toMatchObject(remVersion(connectorOneUpdated));
    expect(getResponse.data.version).toBeUUID();
    expect(getResponse.data.version).not.toBe(connectorOne.id);
  });

  test('Update Connector returns 404 if connector not found', async () => {
    const connectorOne = await createConnectorTest(makeConnector());
    const connectorOneUpdated = {
      ...connectorOne,
      data: { newData: 'abc' },
      tags: { newTag: 'efg' },
      id: 'invalid id',
    };
    const updateResponse = await ApiRequestMap.connector.putAndWait(account, connectorOne.id, connectorOneUpdated);
    expect(updateResponse).toBeHttp({ statusCode: 404 });
  });

  test('Delete Connector', async () => {
    const connectorOne = await createConnectorTest(makeConnector());
    const deleteResponse = await ApiRequestMap.connector.deleteAndWait(account, connectorOne.id);
    expect(deleteResponse).toBeHttp({ statusCode: 200 });
    expect(deleteResponse.data).toBeTruthy();
    const getResponse = await ApiRequestMap.connector.get(account, connectorOne.id);
    expect(getResponse).toBeHttp({ statusCode: 404 });
  });

  test('Delete Connector returns Not Found', async () => {
    const deleteResponse = await ApiRequestMap.connector.deleteAndWait(account, makeConnector().id);
    expect(deleteResponse).toBeHttp({ statusCode: 404 });
  });

  test('Get Connector', async () => {
    const connectorOne = await createConnectorTest(makeConnector());
    const getResponse = await ApiRequestMap.connector.get(account, connectorOne.id);
    expect(getResponse).toBeHttp({ statusCode: 200 });
    expect(getResponse.data).toMatchObject(connectorOne);
  });

  test('Get Connector returns 404 when not found', async () => {
    const getResponse = await ApiRequestMap.connector.get(account, 'Bad Id');
    expect(getResponse).toBeHttp({ statusCode: 404 });
  });

  test('List Connectors, Paginated', async () => {
    const connectorCount = 10;
    const pages = 5;
    const limit = connectorCount / pages;
    const Connectors = Array(connectorCount)
      .fill(undefined)
      .map(() => {
        return {
          ...makeConnector(),
          id: newId('Mapped-Connector'),
        };
      });
    await Promise.all(Connectors.map(async (connector) => ApiRequestMap.connector.postAndWait(account, connector)));
    const fullListResponse = await ApiRequestMap.connector.list(account, getIdPrefix());
    expect(fullListResponse).toBeHttp({ statusCode: 200 });
    expect(fullListResponse.data.items).toHaveLength(connectorCount);

    let next: any;
    let pageResponse: any;
    const receivedIds: string[] = [];
    for (let page = 0; page < pages; page++) {
      pageResponse = await ApiRequestMap.connector.list(account, { ...getIdPrefix(), limit, next });
      expect(pageResponse).toBeHttp({ statusCode: 200 });
      expect(pageResponse.data).toBeDefined();
      expect(pageResponse.data.items).toBeDefined();
      expect(pageResponse.data.items).toHaveLength(2);
      pageResponse.data.items.forEach((i: any) => receivedIds.push(i.id));
      if (page < pages - 1) {
        expect(pageResponse.data.next).toBeDefined();
        next = pageResponse.data.next;
      }
    }

    expect(receivedIds.sort()).toEqual(Connectors.map((c: any) => c.id).sort());
  });

  test('List Connectors by prefix', async () => {
    const connectorCount = 10;
    const connectorBase = makeConnector();
    const sections = [
      {
        prefix: (index?: number) => `prefix1-${index || ''}`,
        size: 1,
        connectors: [],
      },
      {
        prefix: (index?: number) => `prefix2-${index || ''}`,
        size: 4,
        connectors: [],
      },
      {
        prefix: (index?: number) => `prefix3-${index || ''}`,
        size: 5,
        connectors: [],
      },
    ];

    const sectionsByConnectorIndex = sections.flatMap((section: any) =>
      Array(section.size)
        .fill(section)
        .map((_, index) => ({
          ...section,
          prefix: section.prefix(index),
        }))
    );
    expect(sections.reduce((acc, cur) => acc + cur.size, 0)).toEqual(connectorCount);
    const Connectors = Array(connectorCount)
      .fill(undefined)
      .map((_, index) => {
        return {
          ...connectorBase,
          id: `${boundaryId}-${sectionsByConnectorIndex[index].prefix}`,
        };
      });
    await Promise.all(Connectors.map(async (connector) => ApiRequestMap.connector.postAndWait(account, connector)));
    const fullListResponse = await ApiRequestMap.connector.list(account, getIdPrefix());
    expect(fullListResponse).toBeHttp({ statusCode: 200 });
    expect(fullListResponse.data.items).toHaveLength(connectorCount);

    await Promise.all(
      sections.map(async (section) => {
        const prefixResponse = await ApiRequestMap.connector.list(account, {
          idPrefix: `${boundaryId}-${section.prefix()}`,
        });
        expect(prefixResponse).toBeHttp({ statusCode: 200 });
        expect(prefixResponse.data.items).toHaveLength(section.size);
        expect(prefixResponse.data.items).toMatchObject(
          Array(section.size)
            .fill(undefined)
            .map((_, index) => ({ ...connectorBase, id: `${boundaryId}-${section.prefix(index)}` }))
        );
      })
    );
  });

  test('List Connectors By Tags', async () => {
    const connectorBase = makeConnector();
    const sections = [
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
    const connectorCount = sections.reduce((acc, cur) => acc + cur.size, 0);

    const Connectors: Model.IEntity[] = sections.flatMap(
      (section: { size: number; tagOne?: boolean; tagTwo?: boolean; tagThree?: boolean }, sectionId: number) =>
        Array(section.size)
          .fill(undefined)
          .map((_, index) => ({
            ...connectorBase,
            ...(section.tagOne && tagOne(index)),
            ...(section.tagTwo && tagTwo(index)),
            ...(section.tagThree && tagThree(index)),
            id: `${boundaryId}-${sectionId}-${index}`,
          }))
    );
    // map of tag count, to verify expected results; {tagKey: {tagValue: count} }
    const TagCountMap: { [key: string]: { [key: string]: number } } = Connectors.reduce(
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
    const creates = await Promise.all(
      Connectors.map(async (connector) => ApiRequestMap.connector.postAndWait(account, connector))
    );
    creates.forEach((e) => expect(e).toBeHttp({ statusCode: 200 }));

    const fullListResponse = await ApiRequestMap.connector.list(account, getIdPrefix());
    expect(fullListResponse).toBeHttp({ statusCode: 200 });
    expect(fullListResponse.data.items).toHaveLength(connectorCount);

    await Promise.all(
      Object.keys(TagCountMap).map(async (tagKey) => {
        const TagKeyOnlyCount = Object.values(TagCountMap[tagKey]).reduce((acc, cur) => acc + cur, 0);
        const tagKeyOnlyResponse = await ApiRequestMap.connector.list(account, { ...getIdPrefix(), tag: { tagKey } });
        expect(tagKeyOnlyResponse).toBeHttp({ statusCode: 200 });
        expect(tagKeyOnlyResponse.data).toBeDefined();
        expect(tagKeyOnlyResponse.data.items).toHaveLength(TagKeyOnlyCount);

        await Promise.all(
          Object.keys(TagCountMap[tagKey]).map(async (tagValue) => {
            const TagKeyValueCount = TagCountMap[tagKey][tagValue];
            const tagKeyValueResponse = await ApiRequestMap.connector.list(account, {
              ...getIdPrefix(),
              tag: { tagKey, tagValue },
            });
            expect(tagKeyValueResponse).toBeHttp({ statusCode: 200 });
            expect(tagKeyValueResponse.data).toBeDefined();
            expect(tagKeyValueResponse.data.items).toHaveLength(TagKeyValueCount);
          })
        );
      })
    );
  });

  test('Get Connector Tags', async () => {
    const connectorOne = await createConnectorTest(makeConnector());
    const connectorTags = await ApiRequestMap.connector.tags.get(account, connectorOne.id);
    expect(connectorTags).toBeHttp({ statusCode: 200 });
    expect(connectorTags.data).toBeDefined();
    expect(connectorTags.data.tags).toEqual(connectorOne.tags);
  });

  test('Get Connector Tags returns 404 on not found', async () => {
    const connectorTags = await ApiRequestMap.connector.tags.get(account, 'bad id');
    expect(connectorTags).toBeHttp({ statusCode: 404 });
  });

  test('Get Connector Tag Value', async () => {
    const connectorOne = await createConnectorTest(makeConnector());
    await Promise.all(
      Object.keys(connectorOne.tags).map(async (tagKey) => {
        const tagValue = await ApiRequestMap.connector.tags.get(account, connectorOne.id, tagKey);
        expect(tagValue).toBeHttp({ statusCode: 200 });
        expect(tagValue.data).toBeDefined();
        expect(String(tagValue.data)).toEqual(connectorOne.tags[tagKey]);
      })
    );
  });

  test('Get Connector Tag Value returns undefined on unset tag', async () => {
    const connectorOne = await createConnectorTest(makeConnector());
    const tagValue = await ApiRequestMap.connector.tags.get(account, connectorOne.id, 'bad tag key');
    expect(tagValue).toBeHttp({ statusCode: 200 });
    expect(tagValue.data).toBeUndefined();
  });

  test('Delete Connector Tag', async () => {
    const connectorOne = await createConnectorTest(makeConnector());
    await Promise.all(
      Object.keys(connectorOne.tags).map(async (tagKey) => {
        const tagValue = await ApiRequestMap.connector.tags.get(account, connectorOne.id, tagKey);
        expect(tagValue).toBeHttp({ statusCode: 200 });
        expect(tagValue.data).toBeDefined();
        expect(String(tagValue.data)).toEqual(connectorOne.tags[tagKey]);
      })
    );
    const ExpectedTags = { ...connectorOne.tags };
    for (const tagKey of Object.keys(connectorOne.tags)) {
      delete ExpectedTags[tagKey];
      const deleteTagResponse = await ApiRequestMap.connector.tags.delete(account, connectorOne.id, tagKey);
      expect(deleteTagResponse).toBeHttp({ statusCode: 200 });
      expect(deleteTagResponse.data).toBeDefined();
      expect(deleteTagResponse.data.tags).toEqual(ExpectedTags);
    }
  });

  test('Delete Connector Tag with invalid tag key has no impact on tags', async () => {
    const connectorOne = await createConnectorTest(makeConnector());
    const connectorTags = await ApiRequestMap.connector.tags.get(account, connectorOne.id);
    expect(connectorTags).toBeHttp({ statusCode: 200 });
    expect(connectorTags.data).toBeDefined();
    expect(connectorTags.data.tags).toEqual(connectorOne.tags);

    const deleteTagResponse = await ApiRequestMap.connector.tags.delete(account, connectorOne.id, 'bad tag key');
    expect(deleteTagResponse).toBeHttp({ statusCode: 200 });
    expect(deleteTagResponse.data).toMatchObject({ ...remVersion(connectorTags.data) });
  });

  test('Update Connector Tag', async () => {
    const connectorOne = await createConnectorTest(makeConnector());
    const tagKey = 'tag key to insert';
    const tagValue = 'tag value to insert';
    const setTagResponse = await ApiRequestMap.connector.tags.put(account, connectorOne.id, tagKey, tagValue);
    expect(setTagResponse).toBeHttp({ statusCode: 200 });
    expect(setTagResponse.data).toBeDefined();
    expect(setTagResponse.data.tags).toEqual({ ...connectorOne.tags, [tagKey]: tagValue });

    const getConnectorResponse = await ApiRequestMap.connector.get(account, connectorOne.id);
    expect(getConnectorResponse).toBeHttp({ statusCode: 200 });
    expect(getConnectorResponse.data).toBeDefined();
    expect(getConnectorResponse.data).toMatchObject({
      ...remVersion(connectorOne),
      tags: { ...connectorOne.tags, [tagKey]: tagValue },
    });
  });

  test('Update Connector Tag returns 404 on not found', async () => {
    const tagKey = 'tag key to insert';
    const tagValue = 'tag value to insert';
    const setTagResponse = await ApiRequestMap.connector.tags.put(account, 'bad connector Id', tagKey, tagValue);
    expect(setTagResponse).toBeHttp({ statusCode: 404 });
  });

  test('Invoke Connector', async () => {
    const connector = await createConnectorTest(makeConnector());
    const location = await getFunctionLocation(account, 'connector', connector.id);
    expect(location).toBeHttp({ statusCode: 200 });
    const call = await callFunction('', location.data.location);
    expect(call).toBeHttp({ statusCode: 200, data: 'hello' });
  }, 10000);
});
