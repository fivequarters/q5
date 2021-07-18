import superagent from 'superagent';

enum HTTPMethod {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  PATCH = 'patch',
  DELETE = 'delete',
}

class SDK {
  private functionAccessToken?: string;
  private baseUrl?: string;

  public initialize = (functionAccessToken: string, baseUrl: string) => {
    this.functionAccessToken = functionAccessToken;
    if (process.env.proxyUrl) {
      const splitUrl = baseUrl.split('/');
      splitUrl[2] = process.env.proxyUrl;
      this.baseUrl = splitUrl.join('/');
    } else {
      this.baseUrl = baseUrl;
    }
  };

  private v2Request = async (method: HTTPMethod = HTTPMethod.GET, uri: string, body?: any) => {
    const uninitialized = [];
    if (!this.functionAccessToken) {
      uninitialized.push('functionAccessToken');
    }
    if (!this.baseUrl) {
      uninitialized.push('baseUrl');
    }
    if (uninitialized.length) {
      throw `SDK class has uninitialized variables: ${uninitialized.join(', ')}`;
    }

    const request = superagent[method](`${this.baseUrl}/${uri}`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${this.functionAccessToken}`)
      .set('Accept', 'application/json')
      .ok((res) => res.status < 300 || res.status === 404);

    if (![HTTPMethod.GET, HTTPMethod.DELETE].includes(method)) {
      return request.send(body);
    } else {
      return request;
    }
  };

  public integration = {
    get: (integrationId: string) => this.v2Request(HTTPMethod.GET, `/integration/${integrationId}`),
    delete: (integrationId: string) => this.v2Request(HTTPMethod.DELETE, `/integration/${integrationId}`),
    put: (integrationId: string, body: any) => this.v2Request(HTTPMethod.PUT, `/integration/${integrationId}`, body),
    post: (integrationId: string, body: any) => this.v2Request(HTTPMethod.POST, `/integration/`, body),
    session: {
      get: (integrationId: string, sessionId: string) =>
        this.v2Request(HTTPMethod.GET, `/integration/${integrationId}/session/${sessionId}`),
      delete: (integrationId: string, sessionId: string) =>
        this.v2Request(HTTPMethod.DELETE, `/integration/${integrationId}/session/${sessionId}`),
      put: (integrationId: string, sessionId: string, body: any) =>
        this.v2Request(HTTPMethod.PUT, `/integration/${integrationId}/session/${sessionId}`, body),
      post: (integrationId: string, sessionId: string, body: any) =>
        this.v2Request(HTTPMethod.POST, `/integration/${integrationId}/session`, body),
    },
    dispatch: async (integrationId: string, method: HTTPMethod, path: string, body?: any) =>
      this.v2Request(method, `/integration/${integrationId}${path}`, body),
  };
  public connector = {
    get: (connectorId: string) => this.v2Request(HTTPMethod.GET, `/connector/${connectorId}`),
    delete: (connectorId: string) => this.v2Request(HTTPMethod.DELETE, `/connector/${connectorId}`),
    put: (connectorId: string, body: any) => this.v2Request(HTTPMethod.PUT, `/connector/${connectorId}`, body),
    post: (connectorId: string, body: any) => this.v2Request(HTTPMethod.POST, `/connector/${connectorId}`, body),
    session: {
      get: (connectorId: string, sessionId: string) =>
        this.v2Request(HTTPMethod.GET, `/connector/${connectorId}/session/${sessionId}`),
      delete: (connectorId: string, sessionId: string) =>
        this.v2Request(HTTPMethod.DELETE, `/connector/${connectorId}/session/${sessionId}`),
      put: (connectorId: string, sessionId: string, body: any) =>
        this.v2Request(HTTPMethod.PUT, `/connector/${connectorId}/session/${sessionId}`, body),
      post: (connectorId: string, sessionId: string, body: any) =>
        this.v2Request(HTTPMethod.POST, `/connector/${connectorId}/session`, body),
    },
    dispatch: async (connectorId: string, method: HTTPMethod, path: string, body?: any) =>
      this.v2Request(method, `/connector/${connectorId}${path}`, body),
  };
  public operation = {
    get: (operationId: string) => this.v2Request(HTTPMethod.GET, `/operation/${operationId}`),
    delete: (operationId: string) => this.v2Request(HTTPMethod.DELETE, `/operation/${operationId}`),
    put: (operationId: string, body: any) => this.v2Request(HTTPMethod.PUT, `/operation/${operationId}`, body),
    post: (operationId: string, body: any) => this.v2Request(HTTPMethod.POST, `/operation/${operationId}`, body),
  };
}

export default SDK;
