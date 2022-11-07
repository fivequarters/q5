import { Model } from '@5qtrs/db';

import {
  cleanupEntities,
  RequestMethod,
  ApiRequestMap,
  waitForCompletion,
  DefaultWaitForCompletionParams,
  usFromTs,
} from './sdk';
import { callFunction, getFunctionLocation, INVALID_UUID } from '../v1/sdk';
import { v2Permissions } from '@5qtrs/constants';
import * as AuthZ from '../v1/authz';

import { getEnv } from '../v1/setup';

// Pull from function.utils so that keyStore.shutdown() and terminate_garbage_collection() get run, otherwise
// the jest process hangs.
import { defaultFrameworkSemver } from '../v1/function.utils';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(async () => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
  // Wait 10 seconds before each test so function-API can catch up so we don't get a bunch of 502s
  await new Promise((res) => setTimeout(res, 10000));
});
afterAll(async () => {
  await cleanupEntities(account);
  // There is a lot of entities to clean up here, so we need to give function-API a moment to chill out
  // before we perform more tests, otherwise bad stuff will happen
  await new Promise((res) => setTimeout(res, 30000));
}, 210000);

// Types
type TestableEntityTypes = Extract<Model.EntityType, Model.EntityType.connector | Model.EntityType.integration>;

type TestableEntity = Model.IIntegration | Model.IConnector;

type SampleEntityMap<T = any> = Record<TestableEntityTypes, (...entity: T[]) => Model.ISdkEntity>;

// SampleEntityMaps
const sampleEntitiesWithData: SampleEntityMap = {
  [Model.EntityType.connector]: (): { id: string; tags: Model.ITags; data: Model.IConnectorData } => ({
    data: {
      handler: '@fusebit-int/oauth-connector',
      files: {},
      configuration: {
        scope: 'test scope',
        accessTokenExpirationBuffer: 123,
      },
    },
    id: newId('Test'),
    tags: { [`oneTag`]: 'one-value', [`twoTags`]: 'two-values' },
  }),
  [Model.EntityType.integration]: (): { id: string; tags: Model.ITags; data: Model.IIntegrationData } => ({
    data: {
      handler: './integrationTest.js',
      files: {
        'package.json': JSON.stringify({
          scripts: {},
          dependencies: {
            '@fusebit-int/framework': defaultFrameworkSemver,
          },
          files: ['./integrationTest.js'],
        }),
        'integrationTest.js': [
          "const { Integration } = require('@fusebit-int/framework');",
          '',
          'const integration = new Integration();',
          'const router = integration.router;',
          '',
          "router.get('/api/', async (ctx) => {",
          "  ctx.body = 'Hello World';",
          '});',
          '',
          "router.get('/api/sillyrabbit', async (ctx) => {",
          "  ctx.body = 'trix are for kids';",
          '});',
          'module.exports = integration;',
        ].join('\n'),
      },
      configuration: {},
      components: [],
      componentTags: {},
    },
    id: newId('Test'),
    tags: { [`oneTag`]: 'one-value', [`twoTags`]: 'two-values' },
  }),
};

const sampleEntitiesWithoutData: SampleEntityMap = (Object as any).fromEntries(
  Object.entries(sampleEntitiesWithData).map(([key, value]) => [key, () => ({ ...value(), data: undefined })])
);

const updateSampleEntities: SampleEntityMap<Model.ISdkEntity> = {
  [Model.EntityType.connector]: (connector: Model.ISdkEntity) => {
    connector.data = connector.data || {};
    connector.data.configuration = connector.data.configuration || {};
    connector.data.configuration.scope = newId('scope');
    connector.tags = { newTag: newId('newTag') };
    return connector;
  },
  [Model.EntityType.integration]: (integration: Model.ISdkEntity) => {
    integration.data = integration.data || {};
    integration.data.configuration = integration.data.configuration || {};
    integration.data.configuration.creation = integration.data.configuration.creation || {};
    integration.data.configuration.creation.autoStep = !integration.data.configuration.creation.autoStep;
    integration.tags = { newTag: newId('newTag') };
    return integration;
  },
};

// Utility Functions
const newId = (wart: string): string => `${boundaryId}-${wart}-${Math.floor(Math.random() * 99999999).toString(8)}`;

const getIdPrefix = () => ({ idPrefix: boundaryId });

const remVersion = (entity: Model.IEntity) => {
  const { version, ...newEntity } = entity;
  return newEntity;
};

const setFiles = (entity: Model.ISdkEntity, newFiles: Record<string, string>, handler?: string): Model.ISdkEntity => {
  const updatedEntity = entity;
  if (!!handler && !Object.keys(newFiles).includes(handler)) {
    throw new Error('Cannot set handler to a file that is not included');
  } else if (handler) {
    entity.data.handler = handler;
  }

  const packageJson = JSON.parse(updatedEntity.data.files['package.json']);
  const packageFiles: string[] = [];
  Object.entries(newFiles).forEach(([key, value]) => {
    packageFiles.push(key);
    updatedEntity.data.files[key] = value;
  });
  packageJson.files = packageFiles;
  updatedEntity.data.files['package.json'] = JSON.stringify(packageJson);
  return updatedEntity;
};

const createEntity = async (testEntityType: TestableEntityTypes, entity: Model.ISdkEntity) => {
  const createResponse = await ApiRequestMap[testEntityType].post(account, entity.id, entity);
  expect(createResponse).toBeHttp({ statusCode: 202 });

  return (
    await waitForCompletion(account, testEntityType, entity.id, undefined, DefaultWaitForCompletionParams, undefined)
  ).data;
};

// Test Collections
const performTests = (testEntityType: TestableEntityTypes, sampleEntityMap: SampleEntityMap) => {
  const createEntityTest = (entity: Model.ISdkEntity) => createEntity(testEntityType, entity);
  const updateEntity = (entity: Model.ISdkEntity & TestableEntity) => updateSampleEntities[testEntityType](entity);
  const sampleEntity = sampleEntityMap[testEntityType];

  test('List Entities returns 200 and an empty list when none exist', async () => {
    const response = await ApiRequestMap[testEntityType].list(account, getIdPrefix());
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.items.length).toBe(0);
  }, 180000);

  test('Create Entity', async () => {
    const entity = await createEntityTest(sampleEntity());
    expect(entity.entityType).toBe(testEntityType);
    expect(entity.__databaseId).toBeUndefined();
  }, 180000);

  test('Create Entity without body id', async () => {
    const entity = sampleEntity();
    delete entity.id;

    const response = await ApiRequestMap[testEntityType].postAndWait(account, boundaryId, entity);
    expect(response).toBeHttp({ statusCode: 200 });
  }, 180000);

  test('Create Entity with different body id', async () => {
    const entity = sampleEntity();
    const entityId1 = entity.id;
    const entityId2 = newId('diff');

    let response = await ApiRequestMap[testEntityType].postAndWait(account, entityId2, entity);
    expect(response).toBeHttp({ statusCode: 200 });

    expect(response.data.id).toBe(entityId2);

    response = await ApiRequestMap[testEntityType].get(account, entityId1);
    expect(response).toBeHttp({ statusCode: 404 });
    response = await ApiRequestMap[testEntityType].get(account, entityId2);
    expect(response).toBeHttp({ statusCode: 200 });
  }, 180000);

  test('Create Entity returns 400 on conflict', async () => {
    const entity = sampleEntity();
    await createEntityTest(entity);

    const result = await ApiRequestMap[testEntityType].post(account, entity.id, entity);
    expect(result).toBeHttp({ statusCode: 400 });
  }, 180000);

  test('Update Entity', async () => {
    const entityOne = await createEntityTest(sampleEntity());
    const entityOneUpdated = updateEntity(entityOne);
    const updateResponse = await ApiRequestMap[testEntityType].putAndWait(account, entityOne.id, entityOneUpdated);
    expect(updateResponse).toBeHttp({ statusCode: 200 });
    const getResponse = await ApiRequestMap[testEntityType].get(account, entityOne.id);
    expect({ ...getResponse.data, version: undefined }).toExtend({ ...entityOneUpdated, version: undefined });
    expect(getResponse.data).toBeDefined();
    expect(getResponse.data.tags).toMatchObject(entityOneUpdated.tags || {});
    expect(getResponse.data.version).toBeUUID();
    expect(getResponse.data.version).not.toBe(entityOne.id);
  }, 180000);

  test('Update Entity returns 404 if entity not found', async () => {
    const entityOne = await createEntityTest(sampleEntity());
    const entityOneUpdated = {
      ...updateEntity(entityOne),
      id: 'invalid-id',
    };
    const updateResponse = await ApiRequestMap[testEntityType].putAndWait(
      account,
      entityOneUpdated.id,
      entityOneUpdated
    );
    expect(updateResponse).toBeHttp({ statusCode: 404 });
  }, 180000);

  test('Delete Entity', async () => {
    const entityOne = await createEntityTest(sampleEntity());
    const deleteResponse = await ApiRequestMap[testEntityType].deleteAndWait(account, entityOne.id);
    expect(deleteResponse).toBeHttp({ statusCode: 404 });

    const getResponse = await ApiRequestMap[testEntityType].get(account, entityOne.id);
    expect(getResponse).toBeHttp({ statusCode: 404 });
  }, 180000);

  test('Delete Entity returns Not Found', async () => {
    const deleteResponse = await ApiRequestMap[testEntityType].deleteAndWait(account, sampleEntity().id);
    expect(deleteResponse).toBeHttp({ statusCode: 404 });
  }, 180000);

  test('Delete Entity with matching version', async () => {
    const entityOne = await createEntityTest(sampleEntity());
    const deleteResponse = await ApiRequestMap[testEntityType].deleteAndWait(
      account,
      entityOne.id + `?version=${entityOne.version}`
    );
    expect(deleteResponse).toBeHttp({ statusCode: 404 });
    const getResponse = await ApiRequestMap[testEntityType].get(account, entityOne.id);
    expect(getResponse).toBeHttp({ statusCode: 404 });
  }, 180000);

  test('Delete Entity with nonmatching version', async () => {
    const entityOne = await createEntityTest(sampleEntity());
    const deleteResponse = await ApiRequestMap[testEntityType].deleteAndWait(
      account,
      entityOne.id + `?version=${INVALID_UUID}`
    );
    expect(deleteResponse).toBeHttp({ statusCode: 409 });
    expect(deleteResponse.data).toBeTruthy();
    const getResponse = await ApiRequestMap[testEntityType].get(account, entityOne.id);
    expect(getResponse).toBeHttp({ statusCode: 200 });
  }, 180000);

  test('Get Entity', async () => {
    const entityOne = await createEntityTest(sampleEntity());
    const getResponse = await ApiRequestMap[testEntityType].get(account, entityOne.id);
    expect(getResponse).toBeHttp({ statusCode: 200 });
    expect(getResponse.data).toExtend(entityOne);
  }, 180000);

  test('Get Entity returns 404 when not found', async () => {
    const getResponse = await ApiRequestMap[testEntityType].get(account, 'invalid-id');
    expect(getResponse).toBeHttp({ statusCode: 404 });
  }, 180000);

  test('List Entitys, Paginated', async () => {
    const entityCount = 10;
    const pages = 5;
    const count = entityCount / pages;
    const Entitys = Array(entityCount)
      .fill(undefined)
      .map(() => {
        return {
          ...sampleEntity(),
          id: newId('Mapped-Entity'),
        };
      });
    await Promise.all(
      Entitys.map(async (entity) => ApiRequestMap[testEntityType].postAndWait(account, entity.id, entity))
    );
    const fullListResponse = await ApiRequestMap[tetEntityType].list(account, getIdPrefix());
    expect(fullListResponse).toBeHttp({ statusCode: 200 });
    expect(fullListResponse.data.items).toHaveLength(entityCount);

    let next: any;
    let pageResponse: any;
    const receivedIds: string[] = [];
    for (let page = 0; page < pages; page++) {
      pageResponse = await ApiRequestMap[testEntityType].list(account, { ...getIdPrefix(), count, next });
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
  }, 180000);

  test('List Entitys, Sorted', async () => {
    const entityCount = 10;
    const Entitys = Array(entityCount)
      .fill(undefined)
      .map(() => {
        return {
          ...sampleEntity(),
          id: newId('Mapped-Entity'),
        };
      });
    await Promise.all(
      Entitys.map(async (entity) => ApiRequestMap[testEntityType].postAndWait(account, entity.id, entity))
    );

    let response = await ApiRequestMap[testEntityType].list(account, getIdPrefix());
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.items).toHaveLength(entityCount);

    const byIds = response.data.items.map((i: any) => i.id).sort();
    const byAdded = [...response.data.items]
      .sort((a: any, b: any) => usFromTs(a.dateAdded) - usFromTs(b.dateAdded))
      .map((i: any) => i.id);
    const byModified = [...response.data.items]
      .sort((a: any, b: any) => usFromTs(a.dateModified) - usFromTs(b.dateModified))
      .map((i: any) => i.id);
    expect(response.data.items.map((item: any) => item.id)).toEqual(byIds);

    response = await ApiRequestMap[testEntityType].list(account, { ...getIdPrefix(), sort: 'dateAdded' });
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.items).toHaveLength(entityCount);

    expect(response.data.items.map((item: any) => item.id)).toEqual(byAdded);

    response = await ApiRequestMap[testEntityType].list(account, { ...getIdPrefix(), sort: 'dateModified' });
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.items).toHaveLength(entityCount);
    expect(response.data.items.map((item: any) => item.id)).toEqual(byModified);

    response = await ApiRequestMap[testEntityType].list(account, { ...getIdPrefix(), sort: '-dateAdded' });
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.items).toHaveLength(entityCount);

    expect(response.data.items.map((item: any) => item.id)).toEqual(byAdded.reverse());

    response = await ApiRequestMap[testEntityType].list(account, { ...getIdPrefix(), sort: '-dateModified' });
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.items).toHaveLength(entityCount);
    expect(response.data.items.map((item: any) => item.id)).toEqual(byModified.reverse());

    response = await ApiRequestMap[testEntityType].list(account, { ...getIdPrefix(), sort: 'anything; else' });
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);

  test('List Entitys by prefix', async () => {
    const entityCount = 10;
    const entityBase = sampleEntity();
    const sections: Array<any> = [
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

    const sectionsByEntityIndex: any[] = (sections as any).flatMap((section: any) =>
      Array(section.size)
        .fill(section)
        .map((item, index) => ({
          ...section,
          prefix: section.prefix(index),
        }))
    );
    expect(sections.reduce((acc, cur) => acc + cur.size, 0)).toEqual(entityCount);
    const Entitys = Array(entityCount)
      .fill(undefined)
      .map((item, index) => {
        return {
          ...entityBase,
          id: `${boundaryId}-${sectionsByEntityIndex[index].prefix}`,
        };
      });
    await Promise.all(
      Entitys.map(async (entity) => ApiRequestMap[testEntityType].postAndWait(account, entity.id, entity))
    );
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
        expect(prefixResponse.data.items).toExtend(
          Array(section.size)
            .fill(undefined)
            .map((item, index) => ({ ...entityBase, id: `${boundaryId}-${section.prefix(index)}` }))
        );
      })
    );
  }, 180000);

  test('List Entitys By Tags', async () => {
    const entityBase = sampleEntity();
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
    const tagOne = (index: number): Model.ITags => ({ tagOne: `${index}` });
    const tagTwo = (index: number): Model.ITags => ({ tagTwo: `${index}` });
    const tagThree = (index: number): Model.ITags => ({ tagThree: `${index}` });
    const entityCount = sections.reduce((acc, cur) => acc + cur.size, 0);

    const Entitys: Model.ISdkEntity[] = (sections as any).flatMap(
      (section: { size: number; tagOne?: boolean; tagTwo?: boolean; tagThree?: boolean }, sectionId: number) =>
        Array(section.size)
          .fill(undefined)
          .map(
            (item, index): Model.ISdkEntity => ({
              ...entityBase,
              tags: {
                ...(section.tagOne ? tagOne(index) : {}),
                ...(section.tagTwo ? tagTwo(index) : {}),
                ...(section.tagThree ? tagThree(index) : {}),
              },
              id: `${boundaryId}-${sectionId}-${index}`,
            })
          )
    );

    // map of tag count, to verify expected results; {tagKey: {tagValue: count} }
    const TagCountMap: { [key: string]: { [key: string]: number } } = Entitys.reduce(
      (acc: { [key: string]: { [key: string]: number } }, cur: Model.ISdkEntity) => {
        if (typeof cur.tags === 'undefined') {
          return acc;
        }
        Object.keys(cur.tags).forEach((curTag) => {
          if (acc[curTag] === undefined) {
            acc[curTag] = {};
          }
          if (acc[curTag][cur.tags![curTag]!] === undefined) {
            acc[curTag][cur.tags![curTag]!] = 0;
          }
          acc[curTag][cur.tags![curTag]!]++;
        });
        return acc;
      },
      {}
    );
    const creates = await Promise.all(
      Entitys.map(async (entity) => ApiRequestMap[testEntityType].postAndWait(account, entity.id, entity))
    );
    creates.forEach((e) => expect(e).toBeHttp({ statusCode: 200 }));

    const fullListResponse = await ApiRequestMap[testEntityType].list(account, getIdPrefix());
    expect(fullListResponse).toBeHttp({ statusCode: 200 });
    expect(fullListResponse.data.items).toHaveLength(entityCount);

    await (Promise as any).all(
      Object.keys(TagCountMap).map(async (tagKey) => {
        const TagKeyOnlyCount = Object.values(TagCountMap[tagKey]).reduce((acc, cur) => acc + cur, 0);
        const tagKeyOnlyResponse = await ApiRequestMap[testEntityType].list(account, {
          ...getIdPrefix(),
          tag: [{ tagKey }],
        });
        expect(tagKeyOnlyResponse).toBeHttp({ statusCode: 200 });
        expect(tagKeyOnlyResponse.data).toBeDefined();
        expect(tagKeyOnlyResponse.data.items).toHaveLength(TagKeyOnlyCount);

        await Promise.all(
          Object.keys(TagCountMap[tagKey]).map(async (tagValue) => {
            const TagKeyValueCount = TagCountMap[tagKey][tagValue];
            const tagKeyValueResponse = await ApiRequestMap[testEntityType].list(account, {
              ...getIdPrefix(),
              tag: [{ tagKey, tagValue }],
            });
            expect(tagKeyValueResponse).toBeHttp({ statusCode: 200 });
            expect(tagKeyValueResponse.data).toBeDefined();
            expect(tagKeyValueResponse.data.items).toHaveLength(TagKeyValueCount);
          })
        );
      })
    );
    const multiTagEntity = await ApiRequestMap[testEntityType].list(account, {
      ...getIdPrefix(),
      tag: [
        { tagKey: 'tagOne', tagValue: '0' },
        { tagKey: 'tagTwo', tagValue: '0' },
        { tagKey: 'tagThree', tagValue: '0' },
      ],
    });
    expect(multiTagEntity).toBeHttp({ statusCode: 200 });
    expect(multiTagEntity.data).toBeDefined();
    expect(multiTagEntity.data.items).toHaveLength(1);
  }, 180000);

  test('List Entities by State', async () => {
    const numValid = 7;
    const numInvalid = 3;
    const validEntitys = Array(numValid)
      .fill(undefined)
      .map(() => {
        return {
          ...sampleEntity(),
          id: newId('State-List'),
        };
      });
    const invalidEntitys = Array(numInvalid)
      .fill(undefined)
      .map(() => {
        return {
          ...sampleEntity(),
          id: newId('State-List'),
        };
      });

    const basicPostToken = await AuthZ.getTokenByPerm({
      allow: [
        { action: v2Permissions[testEntityType].add, resource: '/' },
        { action: v2Permissions[testEntityType].get, resource: '/' },
      ],
    });

    await Promise.all([
      ...validEntitys.map(async (entity) => ApiRequestMap[testEntityType].postAndWait(account, entity.id, entity)),
      ...invalidEntitys.map(async (entity) => {
        const result = await ApiRequestMap[testEntityType].postAndWait(
          account,
          entity.id,
          entity,
          { allowFailure: true },
          {
            authz: basicPostToken,
          }
        );
        expect(result).toBeHttp({
          statusCode: 200,
          data: {
            state: Model.EntityState.invalid,
            operationState: {
              operation: Model.OperationType.creating,
              status: Model.OperationStatus.failed,
              errorCode: Model.OperationErrorCode.InvalidParameterValue,
            },
          },
        });
        return result;
      }),
    ]);
    let listResponse = await ApiRequestMap[testEntityType].list(account, {
      state: Model.EntityState.active,
      idPrefix: boundaryId,
    });
    expect(listResponse).toBeHttp({ statusCode: 200 });
    expect(listResponse.data.items).toHaveLength(numValid);

    listResponse = await ApiRequestMap[testEntityType].list(account, {
      state: Model.EntityState.invalid,
      idPrefix: boundaryId,
    });
    expect(listResponse).toBeHttp({ statusCode: 200 });
    expect(listResponse.data.items).toHaveLength(numInvalid);
  }, 180000);

  test('Get Entity Tags', async () => {
    const entityOne = await createEntityTest(sampleEntity());
    const entityTags = await ApiRequestMap[testEntityType].tags.get(account, entityOne.id);
    expect(entityTags).toBeHttp({ statusCode: 200 });
    expect(entityTags.data).toBeDefined();
    expect(entityTags.data.tags).toEqual(entityOne.tags);
  }, 180000);

  test('Get Entity Tags returns 404 on not found', async () => {
    const entityTags = await ApiRequestMap[testEntityType].tags.get(account, 'invalid-id');
    expect(entityTags).toBeHttp({ statusCode: 404 });
  }, 180000);

  test('Get Entity Tag Value', async () => {
    const entityOne = await createEntityTest(sampleEntity());
    await Promise.all(
      Object.keys(entityOne.tags).map(async (tagKey) => {
        const tagValue = await ApiRequestMap[testEntityType].tags.get(account, entityOne.id, tagKey);
        expect(tagValue).toBeHttp({ statusCode: 200 });
        expect(tagValue.data).toBeDefined();
        expect(String(tagValue.data)).toEqual(entityOne.tags[tagKey]);
      })
    );
  }, 180000);

  test('Get Entity Tag Value returns undefined on unset tag', async () => {
    const entityOne = await createEntityTest(sampleEntity());
    const tagValue = await ApiRequestMap[testEntityType].tags.get(account, entityOne.id, 'unknown-tag-key');
    expect(tagValue).toBeHttp({ statusCode: 200 });
    expect(tagValue.data).toBeUndefined();
  }, 180000);

  test('Delete Entity Tag', async () => {
    const entityOne = await createEntityTest(sampleEntity());
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
  }, 180000);

  test('Delete Entity Tag with invalid tag key has no impact on tags', async () => {
    const entityOne = await createEntityTest(sampleEntity());
    const entityTags = await ApiRequestMap[testEntityType].tags.get(account, entityOne.id);
    expect(entityTags).toBeHttp({ statusCode: 200 });
    expect(entityTags.data).toBeDefined();
    expect(entityTags.data.tags).toEqual(entityOne.tags);

    const deleteTagResponse = await ApiRequestMap[testEntityType].tags.delete(account, entityOne.id, 'unknown-tag-key');
    expect(deleteTagResponse).toBeHttp({ statusCode: 200 });
    expect(deleteTagResponse.data).toMatchObject({ ...remVersion(entityTags.data) });
  }, 180000);

  test('Update Entity Tag', async () => {
    const entityOne = await createEntityTest(sampleEntity());
    const tagKey = 'tagkeytoinsert';
    const tagValue = 'tagvaluetoinsert';
    const setTagResponse = await ApiRequestMap[testEntityType].tags.put(account, entityOne.id, tagKey, tagValue);
    expect(setTagResponse).toBeHttp({ statusCode: 200 });
    expect(setTagResponse.data).toBeDefined();
    expect(setTagResponse.data.tags).toEqual({ ...entityOne.tags, [tagKey]: tagValue });

    const getEntityResponse = await ApiRequestMap[testEntityType].get(account, entityOne.id);
    expect(getEntityResponse).toBeHttp({ statusCode: 200 });
    expect(getEntityResponse.data).toBeDefined();
    expect(getEntityResponse.data).toExtend({
      ...remVersion(entityOne),
      tags: { ...entityOne.tags, [tagKey]: tagValue },
    });
  }, 180000);

  test('Update Entity Tag returns 404 on not found', async () => {
    const tagKey = 'tagkeytoinsert';
    const tagValue = 'tagvaluetoinsert';
    const setTagResponse = await ApiRequestMap[testEntityType].tags.put(account, 'unknown-entity-id', tagKey, tagValue);
    expect(setTagResponse).toBeHttp({ statusCode: 404 });
  }, 180000);

  test('Invoke Entity Function', async () => {
    const entity = await createEntityTest(sampleEntity());
    const location = await getFunctionLocation(account, testEntityType, entity.id);
    expect(location).toBeHttp({ statusCode: 200 });
    const call = await callFunction('', location.data.location + '/api/health');
    expect(call).toBeHttp({ statusCode: 200 });
  }, 180000);

  test('Invoke Entity Dispatch', async () => {
    const entity = await createEntityTest(sampleEntity());
    const invokeResponse = await ApiRequestMap[testEntityType].dispatch(
      account,
      entity.id,
      RequestMethod.get,
      '/api/health'
    );
    expect(invokeResponse).toBeHttp({ statusCode: 200 });
  }, 180000);

  test('Entity Empty POST', async () => {
    const createResponse = await ApiRequestMap[testEntityType].post(account, boundaryId);
    expect(createResponse).toBeHttp({ statusCode: 202 });
  }, 180000);

  test('Entity Empty POST with ID', async () => {
    const createResponse = await ApiRequestMap[testEntityType].postAndWait(account, boundaryId, { id: boundaryId });
    expect(createResponse).toBeHttp({ statusCode: 200 });
  }, 180000);
};

// Test Executions
describe('Connector with Data', () => performTests(Model.EntityType.connector, sampleEntitiesWithData));
describe('Connector without Data', () => performTests(Model.EntityType.connector, sampleEntitiesWithoutData));
