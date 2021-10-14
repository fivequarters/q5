import { readFileSync } from 'fs';
import { resolve } from 'path';
import faker, { fake } from 'faker';
import { ApiRequestMap, cleanupEntities, RequestMethod } from './sdk';
import { getEnv } from '../v1/setup';
export const defaultFrameworkSemver = '>5.2.0';

let createdIntegrationId: string;

const TEST_TIMEOUT_IN_MS = 60 * 3 * 1000;

const SHARED_BUCKET_NAME = 'fusebit-bucket';

let { account, boundaryId } = getEnv();

const getIntegration = async (entityId: string) => {
  const integration = await ApiRequestMap.integration.get(account, entityId);
  if (integration.status === 200) {
    return integration;
  }
};

const initializeIntegration = async () => {
  const integrationEntity = getIntegrationEntity('14');
  createdIntegrationId = integrationEntity.id;
  const integration = await getIntegration(integrationEntity.id);
  if (integration) {
    return integration;
  }
  const createIntegrationResponse = await ApiRequestMap.integration.postAndWait(
    account,
    integrationEntity.id,
    integrationEntity
  );
  return createIntegrationResponse;
};

beforeAll(async () => {
  ({ account, boundaryId } = getEnv());
  await initializeIntegration();
}, TEST_TIMEOUT_IN_MS);

afterAll(async () => {
  await cleanupEntities(account);
}, TEST_TIMEOUT_IN_MS);

const loadFile = (fileName: string) => {
  const filePath = resolve(__dirname, fileName);
  const file = readFileSync(filePath);
  return file.toString('utf-8');
};

const getIntegrationEntity = (nodeVersion: string) => {
  return {
    data: {
      handler: './integration.js',
      files: {
        'package.json': JSON.stringify({
          scripts: {},
          dependencies: {
            '@fusebit-int/framework': defaultFrameworkSemver,
          },
          files: ['./integration.js'],
          engines: {
            node: nodeVersion,
          },
        }),
        'integration.js': loadFile('mock/integration.storage.js'),
      },
    },
    id: boundaryId,
  };
};

describe('Integration Storage SDK test suite', () => {
  test(
    'When the integration is created, it should respond to the health check successfully',
    async () => {
      const integrationSetDataResponse = await ApiRequestMap.integration.dispatch(
        account,
        createdIntegrationId,
        RequestMethod.get,
        '/api/health'
      );
      expect(integrationSetDataResponse).toBeHttp({ statusCode: 200 });
    },
    TEST_TIMEOUT_IN_MS
  );

  test(
    'When creating a new bucket, should save it in the storage',
    async () => {
      const bucketData = [
        {
          bucket: 'colors',
          data: ['orange', 'yellow', 'green'],
        },
      ];
      const response = await ApiRequestMap.integration.dispatch(
        account,
        createdIntegrationId,
        RequestMethod.post,
        `/api/storage/${SHARED_BUCKET_NAME}`,
        {
          body: bucketData,
        }
      );
      const expectedResult = [{ bucket: 'colors', data: ['orange', 'yellow', 'green'] }];
      expect(response).toBeHttp({ statusCode: 200 });
      expect(response.data).toStrictEqual(expectedResult);
    },
    TEST_TIMEOUT_IN_MS
  );

  test(
    'Should return the saved items from an existing bucket',
    async () => {
      const bucketItemsName = 'colors';
      const bucketKey = `${SHARED_BUCKET_NAME}/${bucketItemsName}`;
      const response = await ApiRequestMap.integration.dispatch(
        account,
        createdIntegrationId,
        RequestMethod.get,
        `/api/storage/${bucketKey}`
      );

      const { storageId, data } = response.data;
      const expectedResponse = {
        storageId: bucketKey,
        data: ['orange', 'yellow', 'green'],
      };
      expect(response).toBeHttp({ statusCode: 200 });
      expect({ storageId, data }).toStrictEqual(expectedResponse);
    },
    TEST_TIMEOUT_IN_MS
  );

  test(
    'Should return empty content (204) for unkown bucket item name',
    async () => {
      const bucketItemsName = 'the-void';
      const bucketKey = `${SHARED_BUCKET_NAME}/${bucketItemsName}`;
      const response = await ApiRequestMap.integration.dispatch(
        account,
        createdIntegrationId,
        RequestMethod.get,
        `/api/storage/${bucketKey}`
      );
      expect(response).toBeHttp({ statusCode: 204 });
    },
    TEST_TIMEOUT_IN_MS
  );

  describe('Storage pagination', () => {
    test(
      'Should allow to list bucket items with default size of 5',
      async () => {
        const bucketName = faker.random.alphaNumeric(10);
        const bucketData = [
          {
            bucket: 'colors',
            data: [faker.internet.color(), faker.internet.color(), faker.internet.color()],
          },
          {
            bucket: 'images',
            data: [faker.image.imageUrl(), faker.image.imageUrl(), faker.image.imageUrl()],
          },
          {
            bucket: 'domains',
            data: [faker.internet.domainName(), faker.internet.domainName(), faker.internet.domainName()],
          },
          {
            bucket: 'links',
            data: [faker.internet.url(), faker.internet.url()],
          },
          {
            bucket: 'emails',
            data: [faker.internet.email(), faker.internet.email()],
          },
          {
            bucket: 'ips',
            data: [faker.internet.ip(), faker.internet.ip()],
          },
        ];
        await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.post,
          `/api/storage/${bucketName}`,
          {
            body: bucketData,
          }
        );

        const response = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.get,
          `/api/storage/${bucketName}`
        );

        const { total, items } = response.data;

        expect(response).toBeHttp({ statusCode: 200 });
        expect(items.length).toBe(5);
        expect(total).toBe(6);
      },
      TEST_TIMEOUT_IN_MS
    );

    test(
      'Should allow to list bucket items with custom pagination size',
      async () => {
        const bucketName = faker.random.alphaNumeric(10);
        const bucketData = [
          {
            bucket: 'colors',
            data: [faker.internet.color(), faker.internet.color(), faker.internet.color()],
          },
          {
            bucket: 'images',
            data: [faker.image.imageUrl(), faker.image.imageUrl(), faker.image.imageUrl()],
          },
          {
            bucket: 'domains',
            data: [faker.internet.domainName(), faker.internet.domainName(), faker.internet.domainName()],
          },
          {
            bucket: 'links',
            data: [faker.internet.url(), faker.internet.url()],
          },
          {
            bucket: 'emails',
            data: [faker.internet.email(), faker.internet.email()],
          },
        ];

        await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.post,
          `/api/storage/${bucketName}`,
          {
            body: bucketData,
          }
        );

        const count = 2;

        const firstBuckets = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.get,
          `/api/storage/${bucketName}?count=${count}`
        );

        const { total, next } = firstBuckets.data;

        expect(firstBuckets).toBeHttp({ statusCode: 200 });
        expect(total).toBe(bucketData.length);
        expect(next).toStrictEqual('2');

        // Paginate to next set of Bucket items
        let nextBuckets = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.get,
          `/api/storage/${bucketName}?count=${count}&next=${next}`
        );

        expect(nextBuckets).toBeHttp({ statusCode: 200 });
        expect(nextBuckets.data.next).toBe('4');

        const lastBucket = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.get,
          `/api/storage/${bucketName}?count=${count}&next=${nextBuckets.data.next}`
        );
        expect(lastBucket).toBeHttp({ statusCode: 200 });
        expect(lastBucket.data.next).toBe(undefined);
      },
      TEST_TIMEOUT_IN_MS
    );
  });

  describe('Storage update', () => {
    test(
      'Should allow to add new items to an existing bucket',
      async () => {
        const bucketName = faker.random.alphaNumeric(10);
        const bucketData = [
          {
            bucket: 'emails',
            data: [faker.internet.email(), faker.internet.email()],
          },
        ];
        const createdBucket = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.post,
          `/api/storage/${bucketName}`,
          {
            body: bucketData,
          }
        );

        expect(createdBucket).toBeHttp({ statusCode: 200 });

        const newData = [faker.internet.email(), faker.internet.email()];

        const expectedResult = bucketData[0].data.concat(newData);

        const updatedBucket = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.put,
          `/api/storage/${bucketName}/emails`,
          {
            body: newData,
          }
        );

        const { data } = updatedBucket.data;

        expect(updatedBucket).toBeHttp({ statusCode: 200 });
        expect(data).toStrictEqual(expectedResult);
      },
      TEST_TIMEOUT_IN_MS
    );

    test(
      'Should allow to replace items completely from an existing bucket',
      async () => {
        const bucketName = faker.random.alphaNumeric(10);
        const bucketData = [
          {
            bucket: 'emails',
            data: [faker.internet.email(), faker.internet.email()],
          },
        ];
        const createdBucket = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.post,
          `/api/storage/${bucketName}`,
          {
            body: bucketData,
          }
        );

        expect(createdBucket).toBeHttp({ statusCode: 200 });

        const newData = [faker.internet.email(), faker.internet.email()];

        const updatedBucket = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.put,
          `/api/storage/${bucketName}/emails?replace=true`,
          {
            body: newData,
          }
        );

        const { data } = updatedBucket.data;

        expect(updatedBucket).toBeHttp({ statusCode: 200 });
        expect(data).toStrictEqual(newData);
      },
      TEST_TIMEOUT_IN_MS
    );

    test(
      'Should handle version conflicts and prevent saving data',
      async () => {
        const bucketName = faker.random.alphaNumeric(10);
        const bucketData = [
          {
            bucket: 'emails',
            data: [faker.internet.email(), faker.internet.email()],
          },
        ];
        const createdBucket = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.post,
          `/api/storage/${bucketName}`,
          {
            body: bucketData,
          }
        );

        expect(createdBucket).toBeHttp({ statusCode: 200 });

        const newData = [faker.internet.email(), faker.internet.email()];

        const updatedBucket = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.put,
          `/api/storage/${bucketName}/emails?version=${faker.random.alphaNumeric()}`,
          {
            body: newData,
          }
        );

        expect(updatedBucket).toBeHttp({ statusCode: 409 });
      },
      TEST_TIMEOUT_IN_MS
    );
  });

  describe('Storage delete', () => {
    test(
      'Should allow to remove a bucket item',
      async () => {
        const bucketName = faker.random.alphaNumeric(10);
        const bucketData = [
          {
            bucket: 'emails',
            data: [faker.internet.email(), faker.internet.email()],
          },
        ];
        const createdBucket = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.post,
          `/api/storage/${bucketName}`,
          {
            body: bucketData,
          }
        );

        expect(createdBucket).toBeHttp({ statusCode: 200 });

        const updatedBucket = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.delete,
          `/api/storage/${bucketName}/emails`
        );

        expect(updatedBucket).toBeHttp({ statusCode: 200 });
      },
      TEST_TIMEOUT_IN_MS
    );

    test(
      'Should allow to remove a specific bucket item version',
      async () => {
        const bucketName = faker.random.alphaNumeric(10);
        const bucketData = [
          {
            bucket: 'emails',
            data: [faker.internet.email(), faker.internet.email()],
          },
        ];
        const createdBucket = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.post,
          `/api/storage/${bucketName}`,
          {
            body: bucketData,
          }
        );

        expect(createdBucket).toBeHttp({ statusCode: 200 });

        const fetchedBucket = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.get,
          `/api/storage/${bucketName}`
        );

        const { items } = fetchedBucket.data;

        const version = (items?.length && items[0].version) || '';

        const deletedBucket = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.delete,
          `/api/storage/${bucketName}/emails?version=${version}`
        );

        expect(deletedBucket).toBeHttp({ statusCode: 200 });
      },
      TEST_TIMEOUT_IN_MS
    );

    test(
      'Should allow to remove completely an entire bucket',
      async () => {
        const bucketName = faker.random.alphaNumeric(10);
        const bucketData = [
          {
            bucket: 'emails',
            data: [faker.internet.email(), faker.internet.email()],
          },
          {
            bucket: 'ips',
            data: [faker.internet.ip(), faker.internet.ip()],
          },
          {
            bucket: 'customer-passwords-plain-text-no-joke',
            data: [faker.internet.password(), faker.internet.password()],
          },
        ];
        const createdBucket = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.post,
          `/api/storage/${bucketName}`,
          {
            body: bucketData,
          }
        );

        expect(createdBucket).toBeHttp({ statusCode: 200 });

        const deletedBucket = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.delete,
          `/api/storage/${bucketName}`
        );

        expect(deletedBucket).toBeHttp({ statusCode: 200 });
      },
      TEST_TIMEOUT_IN_MS
    );

    test(
      'Should allow to remove completely all the subscription buckets',
      async () => {
        const bucket1 = faker.random.alphaNumeric(10);
        const bucket2 = faker.random.alphaNumeric(10);
        const bucketData = [
          {
            bucket: 'emails',
            data: [faker.internet.email(), faker.internet.email()],
          },
        ];
        const createdBucket1 = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.post,
          `/api/storage/${bucket1}`,
          {
            body: bucketData,
          }
        );

        const createdBucket2 = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.post,
          `/api/storage/${bucket2}`,
          {
            body: bucketData,
          }
        );

        expect(createdBucket1).toBeHttp({ statusCode: 200 });
        expect(createdBucket2).toBeHttp({ statusCode: 200 });

        const deletedSubscriptionBuckets = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.delete,
          '/api/storage/all?recursive=true'
        );

        expect(deletedSubscriptionBuckets).toBeHttp({ statusCode: 200 });
      },
      TEST_TIMEOUT_IN_MS
    );

    test(
      'Should prevent to remove completely all the subscription buckets if recursive is not explicitly set',
      async () => {
        const bucket = faker.random.alphaNumeric(10);
        const bucketData = [
          {
            bucket: 'emails',
            data: [faker.internet.email(), faker.internet.email()],
          },
        ];
        const createdBucket = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.post,
          `/api/storage/${bucket}`,
          {
            body: bucketData,
          }
        );

        expect(createdBucket).toBeHttp({ statusCode: 200 });

        const deletedSubscriptionBuckets = await ApiRequestMap.integration.dispatch(
          account,
          createdIntegrationId,
          RequestMethod.delete,
          '/api/storage/all'
        );

        const { message } = deletedSubscriptionBuckets.data;

        expect(deletedSubscriptionBuckets).toBeHttp({ statusCode: 500 });

        expect(message).toStrictEqual(
          'You are attempting to recursively delete all storage objects in the Fusebit subscription. If this is your intent, please pass "true" as the argument in the call to deleteAll(forceRecursive).'
        );
      },
      TEST_TIMEOUT_IN_MS
    );
  });
});
