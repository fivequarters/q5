import { ApiRequestMap } from './sdk';

import { getEnv } from './setup';
import { ConnectorService } from '../../src/routes/service';
import { Model } from '@5qtrs/db';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

interface ConnectorRequestBody extends Model.IEntity {
  entityType: 'connector';
}

interface ConnectorDefinitions {
  ConnectorOne: ConnectorRequestBody;
}

const MakeConnectorDefinitions = (executionCount: number): ConnectorDefinitions => ({
  ConnectorOne: {
    accountId: account.accountId,
    data: { testData: '123' },
    id: `Test-${executionCount}`,
    subscriptionId: account.subscriptionId,
    tags: { [`oneTag ${executionCount}`]: 'one value', [`twoTags ${executionCount}`]: 'two values' },
    entityType: 'connector',
  },
});
let executionCount = 0;
const ConnectorDefinitions = MakeConnectorDefinitions(0);

const createConnectorTest = async (connector: Model.IEntity = ConnectorDefinitions.ConnectorOne) => {
  const createResponse = await ApiRequestMap.connector.post(account, connector);
  expect(createResponse).toBeHttp({ statusCode: 200 });
  const listResponse = await ApiRequestMap.connector.list(account);
  expect(listResponse).toBeHttp({ statusCode: 200 });
  expect(listResponse.data).toBeDefined();
  expect(listResponse.data.items).toEqual([{ ...connector, version: connector.version ? connector.version + 1 : 1 }]);
  return listResponse.data.items[0];
};

describe.skip('Connector', () => {
  afterEach(async () => {
    const connectorService = new ConnectorService();
    try {
      const connectors = await connectorService.dao.listEntities({
        accountId: account.accountId,
        subscriptionId: account.subscriptionId,
      });
      await Promise.all(
        connectors.items.map((connector) => {
          connectorService.dao.deleteEntity(connector);
        })
      );
    } catch (e) {
      expect(e).toBeHttp({ statusCode: 404 });
    }
    Object.assign(ConnectorDefinitions, MakeConnectorDefinitions(++executionCount));
  });
  test('List Connectors returns 404 when none exist', async () => {
    //const r = await listConnectors(account);
    const response = await ApiRequestMap.connector.list(account);
    expect(response).toBeHttp({ statusCode: 404 });
  });
  test('Create Connector', async () => {
    await createConnectorTest();
  });
  test('Create Connector returns 400 on conflict', async () => {
    await createConnectorTest();
    const createResponseConflict = await ApiRequestMap.connector.post(account, ConnectorDefinitions.ConnectorOne);
    expect(createResponseConflict).toBeHttp({ status: 400 });
  });
  test('Update Connector', async () => {
    const ConnectorOne = await createConnectorTest();
    const ConnectorOneUpdated = {
      ...ConnectorOne,
      data: { newData: 'abc' },
      tags: { newTag: 'efg' },
    };
    const updateResponse = await ApiRequestMap.connector.put(account, ConnectorOne.id, ConnectorOneUpdated);
    expect(updateResponse).toBeHttp({ statusCode: 200 });
    const getResponse = await ApiRequestMap.connector.get(account, ConnectorOne.id);
    expect(getResponse.data).toBeDefined();
    expect(getResponse.data).toEqual({ ...ConnectorOneUpdated, version: ConnectorOneUpdated.version + 1 });
  });
  test('Update Connector returns 404 if connector not found', async () => {
    const ConnectorOne = await createConnectorTest();
    const ConnectorOneUpdated = {
      ...ConnectorOne,
      data: { newData: 'abc' },
      tags: { newTag: 'efg' },
      id: 'new name',
    };
    const updateResponse = await ApiRequestMap.connector.put(account, ConnectorOne.id, ConnectorOneUpdated);
    expect(updateResponse).toBeHttp({ statusCode: 404 });
  });

  test('Delete Connector', async () => {
    const ConnectorOne = await createConnectorTest();
    const deleteResponse = await ApiRequestMap.connector.delete(account, ConnectorOne.id);
    expect(deleteResponse).toBeHttp({ statusCode: 200 });
    expect(deleteResponse.data).toBeTruthy();
    const getResponse = await ApiRequestMap.connector.get(account, ConnectorOne.id);
    expect(getResponse).toBeHttp({ statusCode: 404 });
  });
  test('Delete Connector returns false when not found', async () => {
    const deleteResponse = await ApiRequestMap.connector.delete(account, ConnectorDefinitions.ConnectorOne.id);
    expect(deleteResponse).toBeHttp({ statusCode: 200 });
    expect(deleteResponse.data).toBeFalsy();
  });

  test('Get Connector', async () => {
    const ConnectorOne = await createConnectorTest();
    const getResponse = await ApiRequestMap.connector.get(account, ConnectorOne.id);
    expect(getResponse).toBeHttp({ statusCode: 200 });
    expect(getResponse.data).toEqual({ ...ConnectorOne, version: 1 });
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
      .map((val, index) => {
        return {
          ...ConnectorDefinitions.ConnectorOne,
          id: `Mapped-Connector-${index}`,
        };
      });
    await Promise.all(Connectors.map(async (connector) => await ApiRequestMap.connector.post(account, connector)));
    const fullListResponse = await ApiRequestMap.connector.list(account);
    expect(fullListResponse).toBeHttp({ statusCode: 200 });
    expect(fullListResponse.data.items).toHaveLength(connectorCount);

    let next, pageResponse;
    for (let page = 0; page < pages; page++) {
      pageResponse = await ApiRequestMap.connector.list(account, { limit, next });
      expect(pageResponse).toBeHttp({ statusCode: 200 });
      expect(pageResponse.data).toBeDefined();
      expect(pageResponse.data.items).toBeDefined();
      expect(pageResponse.data.items).toHaveLength(2);
      expect(pageResponse.data.items).toEqual([
        { ...Connectors[page * limit], version: 1 },
        { ...Connectors[page * limit + 1], version: 1 },
      ]);
      if (page < pages - 1) {
        expect(pageResponse.data.next).toBeDefined();
        next = pageResponse.data.next;
      }
    }
  });
  test('List Connectors by prefix', async () => {
    const connectorCount = 10;
    let sections = [
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
        .map((value, index) => ({
          ...section,
          prefix: section.prefix(index),
        }))
    );
    expect(sections.reduce((acc, cur) => acc + cur.size, 0)).toEqual(connectorCount);
    const Connectors = Array(connectorCount)
      .fill(undefined)
      .map((val, index) => {
        return {
          ...ConnectorDefinitions.ConnectorOne,
          id: sectionsByConnectorIndex[index].prefix,
        };
      });
    await Promise.all(Connectors.map(async (connector) => await ApiRequestMap.connector.post(account, connector)));
    const fullListResponse = await ApiRequestMap.connector.list(account);
    expect(fullListResponse).toBeHttp({ statusCode: 200 });
    expect(fullListResponse.data.items).toHaveLength(connectorCount);

    await Promise.all(
      sections.map(async (section) => {
        const prefixResponse = await ApiRequestMap.connector.list(account, { idPrefix: section.prefix() });
        expect(prefixResponse).toBeHttp({ statusCode: 200 });
        expect(prefixResponse.data.items).toHaveLength(section.size);
        expect(prefixResponse.data.items).toEqual(
          Array(section.size)
            .fill(undefined)
            .map((value, index) => ({ ...ConnectorDefinitions.ConnectorOne, id: section.prefix(index), version: 1 }))
        );
      })
    );
  });

  test('List Connectors By Tags', async () => {
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
    const connectorCount = sections.reduce((acc, cur) => acc + cur.size, 0);

    const Connectors: Model.IEntity[] = sections.flatMap(
      (section: { size: number; tagOne?: boolean; tagTwo?: boolean; tagThree?: boolean }, sectionId: number) =>
        Array(section.size)
          .fill(undefined)
          .map((value, index) => ({
            ...ConnectorDefinitions.ConnectorOne,
            ...(section.tagOne && tagOne(index)),
            ...(section.tagTwo && tagTwo(index)),
            ...(section.tagThree && tagThree(index)),
            id: `${sectionId}_${index}`,
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
    await Promise.all(Connectors.map(async (connector) => await ApiRequestMap.connector.post(account, connector)));
    const fullListResponse = await ApiRequestMap.connector.list(account);
    expect(fullListResponse).toBeHttp({ statusCode: 200 });
    expect(fullListResponse.data.items).toHaveLength(connectorCount);

    await Promise.all(
      Object.keys(TagCountMap).map(async (tagKey) => {
        const TagKeyOnlyCount = Object.values(TagCountMap[tagKey]).reduce((acc, cur) => acc + cur, 0);
        const tagKeyOnlyResponse = await ApiRequestMap.connector.list(account, { tag: { tagKey } });
        expect(tagKeyOnlyResponse).toBeHttp({ statusCode: 200 });
        expect(tagKeyOnlyResponse.data).toBeDefined();
        expect(tagKeyOnlyResponse.data.items).toHaveLength(TagKeyOnlyCount);

        await Promise.all(
          Object.keys(TagCountMap[tagKey]).map(async (tagValue) => {
            const TagKeyValueCount = TagCountMap[tagKey][tagValue];
            const tagKeyValueResponse = await ApiRequestMap.connector.list(account, { tag: { tagKey, tagValue } });
            expect(tagKeyValueResponse).toBeHttp({ statusCode: 200 });
            expect(tagKeyValueResponse.data).toBeDefined();
            expect(tagKeyValueResponse.data.items).toHaveLength(TagKeyValueCount);
          })
        );
      })
    );
  });

  test('Get Connector Tags', async () => {
    const ConnectorOne = await createConnectorTest();
    const connectorTags = await ApiRequestMap.connector.tags.get(account, ConnectorOne.id);
    expect(connectorTags).toBeHttp({ statusCode: 200 });
    expect(connectorTags.data).toBeDefined();
    expect(connectorTags.data.tags).toEqual(ConnectorOne.tags);
  });
  test('Get Connector Tags returns 404 on not found', async () => {
    const connectorTags = await ApiRequestMap.connector.tags.get(account, 'bad id');
    expect(connectorTags).toBeHttp({ statusCode: 404 });
  });

  test('Get Connector Tag Value', async () => {
    const ConnectorOne = await createConnectorTest();
    await Promise.all(
      Object.keys(ConnectorOne.tags).map(async (tagKey) => {
        const tagValue = await ApiRequestMap.connector.tags.get(account, ConnectorOne.id, tagKey);
        expect(tagValue).toBeHttp({ statusCode: 200 });
        expect(tagValue.data).toBeDefined();
        expect(String(tagValue.data)).toEqual(ConnectorOne.tags[tagKey]);
      })
    );
  });
  test('Get Connector Tag Value returns undefined on unset tag', async () => {
    const ConnectorOne = await createConnectorTest();
    const tagValue = await ApiRequestMap.connector.tags.get(account, ConnectorOne.id, 'bad tag key');
    expect(tagValue).toBeHttp({ statusCode: 200 });
    expect(tagValue.data).toBeUndefined();
  });

  test('Delete Connector Tag', async () => {
    const ConnectorOne = await createConnectorTest();
    await Promise.all(
      Object.keys(ConnectorOne.tags).map(async (tagKey) => {
        const tagValue = await ApiRequestMap.connector.tags.get(account, ConnectorOne.id, tagKey);
        expect(tagValue).toBeHttp({ statusCode: 200 });
        expect(tagValue.data).toBeDefined();
        expect(String(tagValue.data)).toEqual(ConnectorOne.tags[tagKey]);
      })
    );
    const ExpectedTags = { ...ConnectorOne.tags };
    const tagKeys = Object.keys(ConnectorOne.tags);
    for (let tagIndex = 0; tagIndex < tagKeys.length; tagIndex++) {
      let tagKey = tagKeys[tagIndex];
      delete ExpectedTags[tagKey];
      const deleteTagResponse = await ApiRequestMap.connector.tags.delete(account, ConnectorOne.id, tagKey);
      expect(deleteTagResponse).toBeHttp({ statusCode: 200 });
      expect(deleteTagResponse.data).toBeDefined();
      expect(deleteTagResponse.data.tags).toEqual(ExpectedTags);
    }
  });
  test('Delete Connector Tag with invalid tag key has no impact on tags', async () => {
    const ConnectorOne = await createConnectorTest();
    const connectorTags = await ApiRequestMap.connector.tags.get(account, ConnectorOne.id);
    expect(connectorTags).toBeHttp({ statusCode: 200 });
    expect(connectorTags.data).toBeDefined();
    expect(connectorTags.data.tags).toEqual(ConnectorOne.tags);

    const deleteTagResponse = await ApiRequestMap.connector.tags.delete(account, ConnectorOne.id, 'bad tag key');
    expect(deleteTagResponse).toBeHttp({ statusCode: 200 });
    expect(deleteTagResponse.data).toEqual({ ...connectorTags.data, version: 2 });
  });

  test('Update Connector Tag', async () => {
    const ConnectorOne = await createConnectorTest();
    const tagKey = 'tag key to insert';
    const tagValue = 'tag value to insert';
    const setTagResponse = await ApiRequestMap.connector.tags.put(account, ConnectorOne.id, tagKey, tagValue);
    expect(setTagResponse).toBeHttp({ statusCode: 200 });
    expect(setTagResponse.data).toBeDefined();
    expect(setTagResponse.data.tags).toEqual({ ...ConnectorOne.tags, [tagKey]: tagValue });

    const getConnectorResponse = await ApiRequestMap.connector.get(account, ConnectorOne.id);
    expect(getConnectorResponse).toBeHttp({ statusCode: 200 });
    expect(getConnectorResponse.data).toBeDefined();
    expect(getConnectorResponse.data).toEqual({
      ...ConnectorOne,
      version: 2,
      tags: { ...ConnectorOne.tags, [tagKey]: tagValue },
    });
  });
  test('Update Connector Tag returns 404 on not found', async () => {
    const tagKey = 'tag key to insert';
    const tagValue = 'tag value to insert';
    const setTagResponse = await ApiRequestMap.connector.tags.put(account, 'bad connector Id', tagKey, tagValue);
    expect(setTagResponse).toBeHttp({ statusCode: 404 });
  });
});
