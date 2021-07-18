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

  public getIntegration = (integrationId: string) => this.v2Request(HTTPMethod.GET, `/integration/${integrationId}`);
  public deleteIntegration = (integrationId: string) =>
    this.v2Request(HTTPMethod.DELETE, `/integration/${integrationId}`);
  public updateIntegration = (integrationId: string, body: any) =>
    this.v2Request(HTTPMethod.PUT, `/integration/${integrationId}`, body);
  public createIntegration = (integrationId: string, body: any) =>
    this.v2Request(HTTPMethod.POST, `/integration/`, body);
  public createIntegrationSession = (integrationId: string, sessionId: string, body: any) =>
    this.v2Request(HTTPMethod.POST, `/integration/${integrationId}/session`, body);
  public updateIntegrationSession = (integrationId: string, sessionId: string, body: any) =>
    this.v2Request(HTTPMethod.PUT, `/integration/${integrationId}/session/${sessionId}`, body);
  public getIntegrationSession = (integrationId: string, sessionId: string) =>
    this.v2Request(HTTPMethod.GET, `/integration/${integrationId}/session/${sessionId}`);
  public deleteIntegrationSession = (integrationId: string, sessionId: string) =>
    this.v2Request(HTTPMethod.DELETE, `/integration/${integrationId}/session/${sessionId}`);
  public callIntegration = async (integrationId: string, method: HTTPMethod, path: string, body?: any) =>
    this.v2Request(method, `/integration/${integrationId}${path}`, body);

  public getConnector = (connectorId: string) => this.v2Request(HTTPMethod.GET, `/connector/${connectorId}`);
  public deleteConnector = (connectorId: string) => this.v2Request(HTTPMethod.DELETE, `/connector/${connectorId}`);
  public updateConnector = (connectorId: string, body: any) =>
    this.v2Request(HTTPMethod.PUT, `/connector/${connectorId}`, body);
  public createConnector = (connectorId: string, body: any) => this.v2Request(HTTPMethod.POST, `/connector/`, body);
  public createConnectorSession = (connectorId: string, sessionId: string, body: any) =>
    this.v2Request(HTTPMethod.POST, `/connector/${connectorId}/session`, body);
  public updateConnectorSession = (connectorId: string, sessionId: string, body: any) =>
    this.v2Request(HTTPMethod.PUT, `/connector/${connectorId}/session/${sessionId}`, body);
  public getConnectorSession = (connectorId: string, sessionId: string) =>
    this.v2Request(HTTPMethod.GET, `/connector/${connectorId}/session/${sessionId}`);
  public deleteConnectorSession = (connectorId: string, sessionId: string) =>
    this.v2Request(HTTPMethod.DELETE, `/connector/${connectorId}/session/${sessionId}`);
  public callConnector = async (connectorId: string, method: HTTPMethod, path: string, body?: any) =>
    this.v2Request(method, `/connector/${connectorId}${path}`, body);

  public getOperation = (operationId: string) => this.v2Request(HTTPMethod.GET, `/operation/${operationId}`);
  public deleteOperation = (operationId: string) => this.v2Request(HTTPMethod.DELETE, `/operation/${operationId}`);
  public updateOperation = (operationId: string, body: any) =>
    this.v2Request(HTTPMethod.PUT, `/operation/${operationId}`, body);
  public createOperation = (operationId: string, body: any) => this.v2Request(HTTPMethod.POST, `/operation/`, body);
}

export default SDK;
