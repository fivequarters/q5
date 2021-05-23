import { Model } from '@5qtrs/db';

import { cleanupEntities, ApiRequestMap } from './sdk';
import { callFunction, getFunctionLocation } from '../v1/sdk';

import { getEnv } from '../v1/setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

interface IEntityRequestBody extends Model.IEntity {
  entityType: string;
}

const newId = (wart: string): string => `${boundaryId}-${wart}-${Math.floor(Math.random() * 99999999).toString(8)}`;

const getIdPrefix = () => ({ idPrefix: boundaryId });

const remVersion = (entity: IEntityRequestBody) => {
  const { version, ...newEntity } = entity;
  return newEntity;
};

afterAll(async () => {
  await cleanupEntities(account);
});

const performTests = (testEntityType: string) => {
  const makeEntity = (): IEntityRequestBody => ({
    accountId: account.accountId,
    data: { testData: '123' },
    id: newId('Test'),
    subscriptionId: account.subscriptionId,
    tags: { [`oneTag`]: 'one value', [`twoTags`]: 'two values' },
    entityType: testEntityType,
  });

  const createEntityTest = async (entity: Model.IEntity) => {
    const createResponse = await ApiRequestMap[testEntityType].post(account, entity);
    expect(createResponse).toBeHttp({ statusCode: 202 });
    const operation = await ApiRequestMap.operation.waitForCompletion(account, createResponse.data.operationId);
    expect(operation).toBeHttp({ statusCode: 200 });
    const listResponse = await ApiRequestMap[testEntityType].list(account, getIdPrefix());
    expect(listResponse).toBeHttp({ statusCode: 200 });
    expect(listResponse.data).toBeDefined();
    expect(listResponse.data.items).toMatchObject([entity]);
    expect(listResponse.data.items[0].version).toBeUUID();
    return listResponse.data.items[0];
  };

  test('List Entitys returns 404 when none exist', async () => {
    const response = await ApiRequestMap[testEntityType].list(account, getIdPrefix());
    expect(response).toBeHttp({ statusCode: 404 });
  });

  test('Create Entity', async () => {
    await createEntityTest(makeEntity());
  });

  test('Create Entity returns 400 on conflict', async () => {
    const entity = makeEntity();
    await createEntityTest(entity);
    const createResponseConflict = await ApiRequestMap[testEntityType].post(account, entity);
    expect(createResponseConflict).toBeHttp({ status: 400 });
  });

  test('Update Entity', async () => {
    const entityOne = await createEntityTest(makeEntity());
    const entityOneUpdated = {
      ...entityOne,
      data: { newData: 'abc' },
      tags: { newTag: 'efg' },
    };
    const updateResponse = await ApiRequestMap[testEntityType].putAndWait(account, entityOne.id, entityOneUpdated);
    expect(updateResponse).toBeHttp({ statusCode: 200 });
    const getResponse = await ApiRequestMap[testEntityType].get(account, entityOne.id);
    expect(getResponse.data).toBeDefined();
    expect(getResponse.data).toMatchObject(remVersion(entityOneUpdated));
    expect(getResponse.data.version).toBeUUID();
    expect(getResponse.data.version).not.toBe(entityOne.id);
  });

  test('Update Entity returns 404 if entity not found', async () => {
    const entityOne = await createEntityTest(makeEntity());
    const entityOneUpdated = {
      ...entityOne,
      data: { newData: 'abc' },
      tags: { newTag: 'efg' },
      id: 'invalid id',
    };
    const updateResponse = await ApiRequestMap[testEntityType].putAndWait(account, entityOne.id, entityOneUpdated);
    expect(updateResponse).toBeHttp({ statusCode: 404 });
  });

  test('Delete Entity', async () => {
    const entityOne = await createEntityTest(makeEntity());
    const deleteResponse = await ApiRequestMap[testEntityType].deleteAndWait(account, entityOne.id);
    expect(deleteResponse).toBeHttp({ statusCode: 200 });
    expect(deleteResponse.data).toBeTruthy();
    const getResponse = await ApiRequestMap[testEntityType].get(account, entityOne.id);
    expect(getResponse).toBeHttp({ statusCode: 404 });
  }, 10000);

  test('Delete Entity returns Not Found', async () => {
    const deleteResponse = await ApiRequestMap[testEntityType].deleteAndWait(account, makeEntity().id);
    expect(deleteResponse).toBeHttp({ statusCode: 404 });
  });

  test('Get Entity', async () => {
    const entityOne = await createEntityTest(makeEntity());
    const getResponse = await ApiRequestMap[testEntityType].get(account, entityOne.id);
    expect(getResponse).toBeHttp({ statusCode: 200 });
    expect(getResponse.data).toMatchObject(entityOne);
  });

  test('Get Entity returns 404 when not found', async () => {
    const getResponse = await ApiRequestMap[testEntityType].get(account, 'Bad Id');
    expect(getResponse).toBeHttp({ statusCode: 404 });
  });

  test('List Entitys, Paginated', async () => {
    const entityCount = 10;
    const pages = 5;
    const limit = entityCount / pages;
    const Entitys = Array(entityCount)
      .fill(undefined)
      .map(() => {
        return {
          ...makeEntity(),
          id: newId('Mapped-Entity'),
        };
      });
    await Promise.all(Entitys.map(async (entity) => ApiRequestMap[testEntityType].postAndWait(account, entity)));
    const fullListResponse = await ApiRequestMap[testEntityType].list(account, getIdPrefix());
    expect(fullListResponse).toBeHttp({ statusCode: 200 });
    expect(fullListResponse.data.items).toHaveLength(entityCount);

    let next: any;
    let pageResponse: any;
    const receivedIds: string[] = [];
    for (let page = 0; page < pages; page++) {
      pageResponse = await ApiRequestMap[testEntityType].list(account, { ...getIdPrefix(), limit, next });
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

    expect(receivedIds.sort()).toEqual(Entitys.map((c: any) => c.id).sort());
  });

  test('List Entitys by prefix', async () => {
    const entityCount = 10;
    const entityBase = makeEntity();
    const sections = [
      {
        prefix: (index?: number) => `prefix1-${index || ''}`,
        size: 1,
        entitys: [],
      },
      {
        prefix: (index?: number) => `prefix2-${index || ''}`,
        size: 4,
        entitys: [],
      },
      {
        prefix: (index?: number) => `prefix3-${index || ''}`,
        size: 5,
        entitys: [],
      },
    ];

    const sectionsByEntityIndex = sections.flatMap((section: any) =>
      Array(section.size)
        .fill(section)
        .map((_, index) => ({
          ...section,
          prefix: section.prefix(index),
        }))
    );
    expect(sections.reduce((acc, cur) => acc + cur.size, 0)).toEqual(entityCount);
    const Entitys = Array(entityCount)
      .fill(undefined)
      .map((_, index) => {
        return {
          ...entityBase,
          id: `${boundaryId}-${sectionsByEntityIndex[index].prefix}`,
        };
      });
    await Promise.all(Entitys.map(async (entity) => ApiRequestMap[testEntityType].postAndWait(account, entity)));
    const fullListResponse = await ApiRequestMap[testEntityType].list(account, getIdPrefix());
    expect(fullListResponse).toBeHttp({ statusCode: 200 });
    expect(fullListResponse.data.items).toHaveLength(entityCount);

    await Promise.all(
      sections.map(async (section) => {
        const prefixResponse = await ApiRequestMap[testEntityType].list(account, {
          idPrefix: `${boundaryId}-${section.prefix()}`,
        });
        expect(prefixResponse).toBeHttp({ statusCode: 200 });
        expect(prefixResponse.data.items).toHaveLength(section.size);
        expect(prefixResponse.data.items).toMatchObject(
          Array(section.size)
            .fill(undefined)
            .map((_, index) => ({ ...entityBase, id: `${boundaryId}-${section.prefix(index)}` }))
        );
      })
    );
  });

  test('List Entitys By Tags', async () => {
    const entityBase = makeEntity();
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
    const entityCount = sections.reduce((acc, cur) => acc + cur.size, 0);

    const Entitys: Model.IEntity[] = sections.flatMap(
      (section: { size: number; tagOne?: boolean; tagTwo?: boolean; tagThree?: boolean }, sectionId: number) =>
        Array(section.size)
          .fill(undefined)
          .map((_, index) => ({
            ...entityBase,
            ...(section.tagOne && tagOne(index)),
            ...(section.tagTwo && tagTwo(index)),
            ...(section.tagThree && tagThree(index)),
            id: `${boundaryId}-${sectionId}-${index}`,
          }))
    );
    // map of tag count, to verify expected results; {tagKey: {tagValue: count} }
    const TagCountMap: { [key: string]: { [key: string]: number } } = Entitys.reduce(
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
      Entitys.map(async (entity) => ApiRequestMap[testEntityType].postAndWait(account, entity))
    );
    creates.forEach((e) => expect(e).toBeHttp({ statusCode: 200 }));

    const fullListResponse = await ApiRequestMap[testEntityType].list(account, getIdPrefix());
    expect(fullListResponse).toBeHttp({ statusCode: 200 });
    expect(fullListResponse.data.items).toHaveLength(entityCount);

    await Promise.all(
      Object.keys(TagCountMap).map(async (tagKey) => {
        const TagKeyOnlyCount = Object.values(TagCountMap[tagKey]).reduce((acc, cur) => acc + cur, 0);
        const tagKeyOnlyResponse = await ApiRequestMap[testEntityType].list(account, {
          ...getIdPrefix(),
          tag: { tagKey },
        });
        expect(tagKeyOnlyResponse).toBeHttp({ statusCode: 200 });
        expect(tagKeyOnlyResponse.data).toBeDefined();
        expect(tagKeyOnlyResponse.data.items).toHaveLength(TagKeyOnlyCount);

        await Promise.all(
          Object.keys(TagCountMap[tagKey]).map(async (tagValue) => {
            const TagKeyValueCount = TagCountMap[tagKey][tagValue];
            const tagKeyValueResponse = await ApiRequestMap[testEntityType].list(account, {
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

  test('Get Entity Tags', async () => {
    const entityOne = await createEntityTest(makeEntity());
    const entityTags = await ApiRequestMap[testEntityType].tags.get(account, entityOne.id);
    expect(entityTags).toBeHttp({ statusCode: 200 });
    expect(entityTags.data).toBeDefined();
    expect(entityTags.data.tags).toEqual(entityOne.tags);
  });

  test('Get Entity Tags returns 404 on not found', async () => {
    const entityTags = await ApiRequestMap[testEntityType].tags.get(account, 'bad id');
    expect(entityTags).toBeHttp({ statusCode: 404 });
  });

  test('Get Entity Tag Value', async () => {
    const entityOne = await createEntityTest(makeEntity());
    await Promise.all(
      Object.keys(entityOne.tags).map(async (tagKey) => {
        const tagValue = await ApiRequestMap[testEntityType].tags.get(account, entityOne.id, tagKey);
        expect(tagValue).toBeHttp({ statusCode: 200 });
        expect(tagValue.data).toBeDefined();
        expect(String(tagValue.data)).toEqual(entityOne.tags[tagKey]);
      })
    );
  });

  test('Get Entity Tag Value returns undefined on unset tag', async () => {
    const entityOne = await createEntityTest(makeEntity());
    const tagValue = await ApiRequestMap[testEntityType].tags.get(account, entityOne.id, 'bad tag key');
    expect(tagValue).toBeHttp({ statusCode: 200 });
    expect(tagValue.data).toBeUndefined();
  });

  test('Delete Entity Tag', async () => {
    const entityOne = await createEntityTest(makeEntity());
    await Promise.all(
      Object.keys(entityOne.tags).map(async (tagKey) => {
        const tagValue = await ApiRequestMap[testEntityType].tags.get(account, entityOne.id, tagKey);
        expect(tagValue).toBeHttp({ statusCode: 200 });
        expect(tagValue.data).toBeDefined();
        expect(String(tagValue.data)).toEqual(entityOne.tags[tagKey]);
      })
    );
    const ExpectedTags = { ...entityOne.tags };
    for (const tagKey of Object.keys(entityOne.tags)) {
      delete ExpectedTags[tagKey];
      const deleteTagResponse = await ApiRequestMap[testEntityType].tags.delete(account, entityOne.id, tagKey);
      expect(deleteTagResponse).toBeHttp({ statusCode: 200 });
      expect(deleteTagResponse.data).toBeDefined();
      expect(deleteTagResponse.data.tags).toEqual(ExpectedTags);
    }
  });

  test('Delete Entity Tag with invalid tag key has no impact on tags', async () => {
    const entityOne = await createEntityTest(makeEntity());
    const entityTags = await ApiRequestMap[testEntityType].tags.get(account, entityOne.id);
    expect(entityTags).toBeHttp({ statusCode: 200 });
    expect(entityTags.data).toBeDefined();
    expect(entityTags.data.tags).toEqual(entityOne.tags);

    const deleteTagResponse = await ApiRequestMap[testEntityType].tags.delete(account, entityOne.id, 'bad tag key');
    expect(deleteTagResponse).toBeHttp({ statusCode: 200 });
    expect(deleteTagResponse.data).toMatchObject({ ...remVersion(entityTags.data) });
  });

  test('Update Entity Tag', async () => {
    const entityOne = await createEntityTest(makeEntity());
    const tagKey = 'tag key to insert';
    const tagValue = 'tag value to insert';
    const setTagResponse = await ApiRequestMap[testEntityType].tags.put(account, entityOne.id, tagKey, tagValue);
    expect(setTagResponse).toBeHttp({ statusCode: 200 });
    expect(setTagResponse.data).toBeDefined();
    expect(setTagResponse.data.tags).toEqual({ ...entityOne.tags, [tagKey]: tagValue });

    const getEntityResponse = await ApiRequestMap[testEntityType].get(account, entityOne.id);
    expect(getEntityResponse).toBeHttp({ statusCode: 200 });
    expect(getEntityResponse.data).toBeDefined();
    expect(getEntityResponse.data).toMatchObject({
      ...remVersion(entityOne),
      tags: { ...entityOne.tags, [tagKey]: tagValue },
    });
  });

  test('Update Entity Tag returns 404 on not found', async () => {
    const tagKey = 'tag key to insert';
    const tagValue = 'tag value to insert';
    const setTagResponse = await ApiRequestMap[testEntityType].tags.put(account, 'bad entity Id', tagKey, tagValue);
    expect(setTagResponse).toBeHttp({ statusCode: 404 });
  });

  test('Invoke Entity', async () => {
    const entity = await createEntityTest(makeEntity());
    const location = await getFunctionLocation(account, testEntityType, entity.id);
    expect(location).toBeHttp({ statusCode: 200 });
    const call = await callFunction('', location.data.location);
    expect(call).toBeHttp({ statusCode: 200, data: 'hello' });
  }, 10000);
};

describe('Connector', () => {
  performTests('connector');
});
