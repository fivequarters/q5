import { Router, Storage, IStorageClient } from '@fusebit-int/framework';
import superagent from 'superagent';

enum HTTPMethod {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  PATCH = 'patch',
  DELETE = 'delete',
}

class Integration {
  constructor() {
    this.router = new Router();
    if (!Integration.functionAccessToken || !Integration.baseUrl) {
      throw 'Integration class is not initialized';
    }
    // this.storageClient = Storage.createStorage({
    //   baseUrl: Integration.baseUrl,
    //   accessToken: Integration.functionAccessToken,
    //   accountId: string;
    //   subscriptionId: string;
    //   storageIdPrefix?: string;
    // });
  }

  public readonly router: Router;

  private static functionAccessToken: string;
  private static baseUrl: string;

  static storageClient: IStorageClient;

  static testVar: string;

  public static initializeClass = (functionAccessToken: string, baseUrl: string) => {
    Integration.functionAccessToken = functionAccessToken;
    if (process.env.proxyUrl) {
      const splitUrl = baseUrl.split('/');
      splitUrl[2] = process.env.proxyUrl;
      Integration.baseUrl = splitUrl.join('/');
    } else {
      Integration.baseUrl = baseUrl;
    }
  };

  private v2Request = async (method: HTTPMethod = HTTPMethod.GET, uri: string, body?: any) => {
    const uninitialized = [];
    if (!Integration.functionAccessToken) {
      uninitialized.push('functionAccessToken');
    }
    if (!Integration.baseUrl) {
      uninitialized.push('baseUrl');
    }
    if (uninitialized.length) {
      throw `SDK class has uninitialized variables: ${uninitialized.join(', ')}`;
    }

    const request = superagent[method](`${Integration.baseUrl}/${uri}`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${Integration.functionAccessToken}`)
      .set('Accept', 'application/json')
      .ok((res) => res.status < 300 || res.status === 404);

    if (![HTTPMethod.GET, HTTPMethod.DELETE].includes(method)) {
      return request.send(body);
    } else {
      return request;
    }
  };

  //
  // storageBaseUrl = `${functionUrl.protocol}//${functionUrl.host}/v1/account/${params.accountId}/subscription/${params.subscriptionId}/storage`
  //
  // readonly storage = {
  //   setData: undefined,
  //   getData: async (storageId: string) =>
  //     await superagent
  //       .get(getUrl(storageSubId))
  //       .set('Authorization', `Bearer ${Integration.functionAccessToken}`)
  //       .ok((res) => res.status < 300 || res.status === 404);
  //   request({
  //   method: 'GET',
  //   headers: {
  //     Authorization: `Bearer ${Integration.functionAccessToken}`,
  //     'Content-Type': 'application/json',
  //     'user-agent': account.userAgent,
  //   },
  //   url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/storage/${storageId}`,
  // });,
  //   deleteData: undefined,
  // };

  readonly middleware = {
    authorizeUser: undefined,
    loadConnector: undefined,
    loadTenant: undefined,
  };

  readonly service = {
    getSDK: undefined,
    getSDKs: undefined,
    getTenant: undefined,
    setTenant: undefined,
    deleteTenant: undefined,
  };

  readonly response = {
    createJsonForm: undefined,
    createError: undefined,
  };
}
type Class<T = any> = new (...args: any[]) => any;

class TestClass<T> {
  testFunc = (arg: T) => undefined;
  testVar: T;
  constructor(testVar: T) {
    this.testVar = testVar;
  }
}

class TestExtend extends TestClass<undefined> {
  constructor() {
    super(undefined);
  }
  testVar = undefined;
}

const test = new TestExtend();
test.testFunc('123');

export default Integration;
