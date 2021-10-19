import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ApiRequestMap, cleanupEntities, RequestMethod } from './sdk';
import { getEnv } from '../v1/setup';
import { defaultFrameworkSemver } from '../v1/function.utils';

interface IRandomBucketData {
  bucket: string;
  data: string[];
}

let createdIntegrationId: string;

const TEST_TIMEOUT_IN_MS = 60 * 3 * 1000;

let { account, boundaryId } = getEnv();

const getIntegration = async (entityId: string) => {
  const integration = await ApiRequestMap.integration.get(account, entityId);
  if (integration.status === 200) {
    return integration;
  }
};

const initializeIntegration = async () => {
  const integrationEntity = getIntegrationEntity();
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

const loadFile = (fileName: string): string => {
  const filePath = resolve(__dirname, fileName);
  const file = readFileSync(filePath, 'utf-8');
  return file;
};

const getIntegrationEntity = () => {
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
        }),
        'integration.js': loadFile('mock/integration.storage.js'),
      },
    },
    id: boundaryId,
  };
};

const createBucket = async (bucketName: string, data: any, version?: string, expires?: string) => {
  const response = await ApiRequestMap.integration.dispatch(
    account,
    createdIntegrationId,
    RequestMethod.post,
    `/api/storage/${bucketName}`,
    {
      body: {
        bucketItems: data,
        expires,
        version,
      },
    }
  );

  return response;
};

const getBucket = async (bucketKey: string) => {
  const response = await ApiRequestMap.integration.dispatch(
    account,
    createdIntegrationId,
    RequestMethod.get,
    `/api/storage/${bucketKey}`
  );
  return response;
};

const updateBucket = async (bucketKey: string, data: any) => {
  const response = await ApiRequestMap.integration.dispatch(
    account,
    createdIntegrationId,
    RequestMethod.put,
    `/api/storage/${bucketKey}`,
    {
      body: data,
    }
  );
  return response;
};

const createBucketAndTestItSucceeds = async () => {
  const bucketName = randomChars();
  const data = generateRandomBucketData();
  const bucketData = [data];
  const response = await createBucket(bucketName, bucketData);

  expect(response).toBeHttp({ statusCode: 200 });

  const bucketItemName = data.bucket;
  const bucketKeyPair = `${bucketName}/${bucketItemName}`;

  return { bucketName, bucketItemName, bucketKeyPair, bucketData, response };
};

const deleteBucket = async (bucketKey: string) => {
  const response = await ApiRequestMap.integration.dispatch(
    account,
    createdIntegrationId,
    RequestMethod.delete,
    `/api/storage/${bucketKey}`
  );
  return response;
};

const randomChars = () => {
  return (Math.random() + 1).toString(36).substring(2);
};

const generateRandomBucketData = (): IRandomBucketData => {
  return {
    bucket: randomChars(),
    data: [randomChars(), randomChars(), randomChars()],
  };
};

describe('Integration Storage SDK test suite', () => {
  test('Should log the instantiated framework version from the created integration', async () => {
    const getFrameworkVersionResponse = await ApiRequestMap.integration.dispatch(
      account,
      createdIntegrationId,
      RequestMethod.get,
      `/api/framework-version`
    );
    expect(getFrameworkVersionResponse).toBeHttp({ statusCode: 200 });
    console.log('@fusebit-int/framework version', getFrameworkVersionResponse.data);
  });
  test(
    'When creating a new bucket, should save it in the storage',
    async () => {
      const { response, bucketData } = await createBucketAndTestItSucceeds();
      expect(response.data).toStrictEqual(bucketData);
    },
    TEST_TIMEOUT_IN_MS
  );

  test(
    'When creating a new bucket expiring in the future should return the bucket',
    async () => {
      const bucketName = randomChars();
      const data = [generateRandomBucketData()];
      const expiresDate = new Date();
      expiresDate.setDate(expiresDate.getDate() + 1);

      const createdBucketResponse = await createBucket(bucketName, data, undefined, expiresDate.toISOString());

      expect(createdBucketResponse).toBeHttp({ statusCode: 200 });

      const getBucketResponse = await getBucket(`${bucketName}/${data[0].bucket}`);
      expect(getBucketResponse).toBeHttp({ statusCode: 200 });
    },
    TEST_TIMEOUT_IN_MS
  );

  test(
    'When creating a new bucket already expired should not return the bucket',
    async () => {
      const bucketName = randomChars();
      const data = [generateRandomBucketData()];
      const expiresDate = new Date(1);
      const createdBucketResponse = await createBucket(bucketName, data, undefined, expiresDate.toISOString());

      expect(createdBucketResponse).toBeHttp({ statusCode: 200 });

      const getBucketResponse = await getBucket(`${bucketName}/${data[0].bucket}`);
      expect(getBucketResponse).toBeHttp({ statusCode: 204 });
    },
    TEST_TIMEOUT_IN_MS
  );

  test(
    'When creating a new bucket with an empty or invalid expires date should not store the bucket',
    async () => {
      const bucketName = randomChars();
      const data = [generateRandomBucketData()];
      let createdBucketResponse = await createBucket(bucketName, data, undefined, '');

      expect(createdBucketResponse).toBeHttp({ statusCode: 400 });

      createdBucketResponse = await createBucket(bucketName, data, undefined, randomChars());

      expect(createdBucketResponse).toBeHttp({ statusCode: 400 });
    },
    TEST_TIMEOUT_IN_MS
  );

  test(
    'Should return the saved items from an existing bucket',
    async () => {
      const { bucketKeyPair, bucketData } = await createBucketAndTestItSucceeds();
      const getBucketResponse = await getBucket(bucketKeyPair);
      const { storageId, data } = getBucketResponse.data;

      expect(getBucketResponse).toBeHttp({ statusCode: 200 });
      expect(storageId).toStrictEqual(bucketKeyPair);
      expect(data).toStrictEqual(bucketData[0]?.data);
    },
    TEST_TIMEOUT_IN_MS
  );

  test(
    'Should return empty content (204) for unknown bucket item name',
    async () => {
      const bucketName = randomChars();
      const bucketItemsName = 'the-void';
      const bucketKey = `${bucketName}/${bucketItemsName}`;
      const response = await getBucket(bucketKey);
      expect(response).toBeHttp({ statusCode: 204 });
    },
    TEST_TIMEOUT_IN_MS
  );

  describe('Storage pagination', () => {
    test(
      'Should allow to list bucket items with default size of 5',
      async () => {
        const bucketName = randomChars();
        const bucketData = [
          generateRandomBucketData(),
          generateRandomBucketData(),
          generateRandomBucketData(),
          generateRandomBucketData(),
          generateRandomBucketData(),
          generateRandomBucketData(),
        ];
        await createBucket(bucketName, bucketData);

        const response = await getBucket(bucketName);
        const { total, items } = response.data;

        expect(response).toBeHttp({ statusCode: 200 });
        expect(items.length).toBe(5);
        expect(total).toBe(bucketData.length);
      },
      TEST_TIMEOUT_IN_MS
    );

    test(
      'Should allow to list bucket items with custom pagination size',
      async () => {
        const bucketName = randomChars();
        const bucketData = [
          generateRandomBucketData(),
          generateRandomBucketData(),
          generateRandomBucketData(),
          generateRandomBucketData(),
          generateRandomBucketData(),
        ];

        await createBucket(bucketName, bucketData);

        const count = 2;
        const firstBuckets = await getBucket(`${bucketName}?count=${count}`);
        const { total, next } = firstBuckets.data;

        expect(firstBuckets).toBeHttp({ statusCode: 200 });
        expect(total).toBe(bucketData.length);
        expect(next).toStrictEqual('2');

        // Paginate to next set of Bucket items
        const nextBuckets = await getBucket(`${bucketName}?count=${count}&next=${next}`);

        expect(nextBuckets).toBeHttp({ statusCode: 200 });
        expect(nextBuckets.data.next).toBe('4');

        const lastBucket = await getBucket(`${bucketName}?count=${count}&next=${nextBuckets.data.next}`);

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
        const { bucketData, bucketKeyPair } = await createBucketAndTestItSucceeds();
        const newData = [randomChars()];
        const expectedResult = [...bucketData[0].data, ...newData];
        const updatedBucket = await updateBucket(bucketKeyPair, newData);
        const { data } = updatedBucket.data;

        expect(updatedBucket).toBeHttp({ statusCode: 200 });
        expect(data).toStrictEqual(expectedResult);
      },
      TEST_TIMEOUT_IN_MS
    );

    test(
      'Should allow to replace items completely from an existing bucket',
      async () => {
        const { bucketKeyPair } = await createBucketAndTestItSucceeds();
        const newData = [generateRandomBucketData(), generateRandomBucketData()];
        const updatedBucket = await updateBucket(`${bucketKeyPair}?replace=true`, newData);
        const { data } = updatedBucket.data;

        expect(updatedBucket).toBeHttp({ statusCode: 200 });
        expect(data).toStrictEqual(newData);
      },
      TEST_TIMEOUT_IN_MS
    );

    test(
      'Should handle version conflicts and prevent saving data',
      async () => {
        const { bucketKeyPair } = await createBucketAndTestItSucceeds();
        const updatedBucket = await updateBucket(`${bucketKeyPair}?version=${randomChars()}`, [
          generateRandomBucketData(),
        ]);

        expect(updatedBucket).toBeHttp({ statusCode: 409 });
      },
      TEST_TIMEOUT_IN_MS
    );
  });

  describe('Storage delete', () => {
    test(
      'Should allow to remove a bucket item',
      async () => {
        const { bucketKeyPair } = await createBucketAndTestItSucceeds();
        const removedBucket = await deleteBucket(bucketKeyPair);

        expect(removedBucket).toBeHttp({ statusCode: 200 });

        const getBucketResponse = await getBucket(bucketKeyPair);

        expect(getBucketResponse).toBeHttp({ statusCode: 204 });
      },
      TEST_TIMEOUT_IN_MS
    );

    test(
      'Should allow to remove a specific bucket item version',
      async () => {
        const { bucketName, bucketKeyPair } = await createBucketAndTestItSucceeds();
        const fetchedBucket = await getBucket(bucketName);
        const { items } = fetchedBucket.data;
        const version = (items?.length && items[0].version) || '';
        const deletedBucket = await deleteBucket(`${bucketKeyPair}?version=${version}`);

        expect(deletedBucket).toBeHttp({ statusCode: 200 });

        const getBucketResponse = await getBucket(bucketKeyPair);

        expect(getBucketResponse).toBeHttp({ statusCode: 204 });
      },
      TEST_TIMEOUT_IN_MS
    );

    test(
      'Should allow to remove completely an entire bucket',
      async () => {
        const { bucketName } = await createBucketAndTestItSucceeds();
        const deletedBucket = await deleteBucket(bucketName);

        expect(deletedBucket).toBeHttp({ statusCode: 200 });

        const getBucketResponse = await getBucket(bucketName);
        const { total, items } = getBucketResponse.data;

        expect(getBucketResponse).toBeHttp({ statusCode: 200 });
        expect(total).toStrictEqual(0);
        expect(items.length).toStrictEqual(0);
      },
      TEST_TIMEOUT_IN_MS
    );
  });
});
